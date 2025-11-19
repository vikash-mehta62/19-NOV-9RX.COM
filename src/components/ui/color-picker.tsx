import React from "react";
import { Input } from "./input";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <Input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-20 p-1"
    />
  );
}