import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsAttributesRecord(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isAttributesRecord',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
          ) {
            return false;
          }
          return Object.values(value).every(
            (v) => typeof v === 'string' && v.trim().length > 0,
          );
        },
        defaultMessage(): string {
          return 'attributes must be an object whose values are all non-empty strings';
        },
      },
    });
  };
}
