import type { FieldMetadata } from "@conform-to/react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type FieldProps = {
  field: FieldMetadata<string, { [key: string]: string | boolean }>;
  label: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  labelProps?: React.ComponentProps<typeof Label>;
  inputProps?: React.ComponentProps<typeof Input>;
};

export function Field({
  field,
  label,
  type = "text",
  placeholder,
  labelProps,
  inputProps,
}: FieldProps) {
  return (
    <div>
      <Label htmlFor="email" className="sr-only" {...labelProps}>
        {label}
      </Label>
      <Input
        id={field.id}
        type={type}
        name={field.name}
        defaultValue={field.initialValue as string}
        required={field.required}
        aria-invalid={field.errors ? true : undefined}
        aria-describedby={field.errors ? field.errorId : undefined}
        placeholder={placeholder}
        className={field.errors ? "border-red-400" : ""}
        {...inputProps}
      />
      <div id={field.errorId} className="mt-1 text-xs text-red-400 italic">
        {field.errors}
      </div>
    </div>
  );
}
