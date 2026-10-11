// Load in mongosh, then migrateAssessmentSubjects(false) for a dry run.
// Explicit apply: migrateAssessmentSubjects(true).
// Backups stay on the same server; no user records are printed or exported.
async function migrateAssessmentSubjects(apply = false) {
  const database = 'workshop-viewer';
  const backupName = 'assessment_section_subject_backup_20261009';
  const target = db.getSiblingDB(database);
  const collections = ['assessmenttests', 'userassessmenttests'];
  const aliases = new Map([['ANGULAR', 'angular'], ['NESTJS', 'nestjs'], ['RXJS', 'rxjs']]);

  async function plan(databaseHandle) {
    const sections = await databaseHandle.sections.find({}, { _id: 1, sectionTitle: 1 }).toArray();
    const byId = new Map(sections.map(section => [String(section._id), section]));
    const definitions = await databaseHandle.assessmenttests.find().toArray();
    const attempts = await databaseHandle.userassessmenttests.find().toArray();
    function sectionFor(subject) {
      if (typeof subject !== 'string') throw new Error('Non-string subject; migration aborted');
      const section = byId.get(aliases.get(subject) || subject);
      if (!section || typeof section.sectionTitle !== 'string' || !section.sectionTitle.trim()) {
        throw new Error('Missing section mapping for subject ' + subject);
      }
      return { subject: String(section._id), sectionTitle: section.sectionTitle };
    }
    const levels = new Set();
    const byDefinition = new Map();
    for (const definition of definitions) {
      const section = sectionFor(definition.subject);
      const key = JSON.stringify([section.subject, definition.level]);
      if (levels.has(key)) throw new Error('Migration would create duplicate subject/level ' + key);
      levels.add(key);
      byDefinition.set(String(definition._id), section.subject);
    }
    for (const attempt of attempts) {
      const expected = byDefinition.get(String(attempt.assessmentTestId));
      if (!expected || expected !== sectionFor(attempt.subject).subject) {
        throw new Error('Orphan or mismatched attempt reference; migration aborted');
      }
    }
    const records = [];
    for (const [index, documents] of [definitions, attempts].entries()) {
      for (const document of documents) {
        const section = sectionFor(document.subject);
        if (document.subject === section.subject && document.sectionTitle === section.sectionTitle) continue;
        if (document.__v !== undefined && (!Number.isInteger(document.__v) || document.__v < 0)) {
          throw new Error('Invalid record version; migration aborted');
        }
        records.push({ collection: collections[index], document, section });
      }
    }
    return { records, totals: { definitions: definitions.length, attempts: attempts.length } };
  }

  const preview = await plan(target);
  const summary = {
    database,
    totals: preview.totals,
    changes: Object.fromEntries(collections.map(name => [name, preview.records.filter(record => record.collection === name).length])),
    mapping: Object.fromEntries(aliases),
    backup: backupName,
  };
  if (!apply || !preview.records.length) {
    print(JSON.stringify({ mode: apply ? 'already-migrated' : 'dry-run', ...summary }));
    return summary;
  }

  const owner = 'section-subject-migration-' + new ObjectId().toString();
  const leases = target.assessment_write_leases;
  // Same lease used by service writes; never steal an unexpired lease.
  await leases.findOneAndUpdate(
    { _id: 'assessment-writes', expires: { $lte: new Date() } },
    { $set: { owner, expires: new Date(Date.now() + 120000) } },
    { upsert: true, writeConcern: { w: 'majority' }, maxTimeMS: 5000 }
  );
  const session = db.getMongo().startSession();
  try {
    const existing = await target.getCollectionNames();
    if (!existing.includes(backupName)) await target.createCollection(backupName);
    if (await target.getCollection(backupName).countDocuments({})) throw new Error('Backup already exists; refusing to overwrite');
    session.startTransaction({ readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 5000 });
    const transaction = session.getDatabase(database);
    const current = await plan(transaction);
    if (JSON.stringify(current.totals) !== JSON.stringify(preview.totals) || current.records.length !== preview.records.length) {
      throw new Error('Records changed after preflight; rerun dry-run');
    }
    const backup = transaction.getCollection(backupName);
    for (const record of current.records) {
      const original = record.document;
      await backup.insertOne({ _id: { collection: record.collection, id: original._id }, document: original });
      const result = await transaction.getCollection(record.collection).updateOne(
        { _id: original._id, subject: original.subject, __v: original.__v === undefined ? { $exists: false } : original.__v },
        { $set: { ...record.section, __v: (original.__v || 0) + 1 } }
      );
      if (result.modifiedCount !== 1) throw new Error('Conditional update failed; transaction aborted');
    }
    await backup.insertOne({ _id: 'manifest', createdAt: new Date(), summary, fieldsChanged: ['subject', 'sectionTitle', '__v'] });
    const verified = await plan(transaction);
    if (verified.records.length) throw new Error('Post-update verification failed');
    for (const record of current.records) {
      const stored = await transaction.getCollection(record.collection).findOne({ _id: record.document._id });
      const restored = { ...stored };
      for (const field of ['subject', 'sectionTitle', '__v']) {
        if (Object.hasOwn(record.document, field)) restored[field] = record.document[field];
        else delete restored[field];
      }
      if (EJSON.stringify(restored, { relaxed: false }) !== EJSON.stringify(record.document, { relaxed: false })) {
        throw new Error('Unexpected change outside migration fields; transaction aborted');
      }
    }
    await session.commitTransaction();
    print(JSON.stringify({ mode: 'committed', ...summary, backupRecords: current.records.length }));
    return summary;
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
    // Retain the lease record, releasing it by expiry rather than deleting it.
    await leases.updateOne({ _id: 'assessment-writes', owner }, { $set: { expires: new Date(0) } }, { writeConcern: { w: 'majority' } });
  }
}
