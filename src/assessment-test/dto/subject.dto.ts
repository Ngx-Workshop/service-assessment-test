import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Section IDs also support the document service's legacy string keys. */
export function SectionId() {
  return function (target: object, propertyKey: string) {
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() : value
    )(target, propertyKey);
    IsString()(target, propertyKey);
    IsNotEmpty()(target, propertyKey);
    MaxLength(120)(target, propertyKey);
  };
}
