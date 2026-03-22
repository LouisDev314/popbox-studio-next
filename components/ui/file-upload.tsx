"use client";

import { ChangeEvent, DragEvent, useId, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface IFileUploadProps {
  onChange?: (files: File[]) => void;
  multiple?: boolean;
}

export const FileUpload = ({ onChange, multiple = false }: IFileUploadProps) => {
  const inputId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const updateFiles = (nextFiles: File[]) => {
    if (nextFiles.length === 0) {
      return;
    }

    setFiles((currentFiles) => (multiple ? [...currentFiles, ...nextFiles] : nextFiles));
    onChange?.(nextFiles);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    updateFiles(Array.from(event.dataTransfer.files ?? []));
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-[#D5C1C9]/60 bg-[#FBFAFB] p-6 transition-colors",
        isDragging && "border-primary bg-primary/5",
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={handleDrop}
    >
      <input
        id={inputId}
        type="file"
        multiple={multiple}
        className="hidden"
        onChange={handleInputChange}
      />

      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#D5C1C9]/40">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-[#191C1E]">
            {multiple ? "Upload product images" : "Upload product image"}
          </p>
          <p className="text-sm text-[#514349]">
            Drag files here or click to browse.
          </p>
        </div>
      </label>

      {files.length > 0 && (
        <div className="mt-5 space-y-2 rounded-lg border border-[#D5C1C9]/40 bg-white p-3">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-[#191C1E]">{file.name}</span>
              <span className="shrink-0 text-xs text-[#514349]/70">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
