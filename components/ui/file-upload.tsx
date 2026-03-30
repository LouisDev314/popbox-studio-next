"use client";

import { ChangeEvent, DragEvent, useId, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface IFileUploadProps {
  onChange?: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSizeBytes?: number;
}

const IMAGE_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'] as const;

function isAcceptedFileType(file: File, accept: string | undefined): boolean {
  if (!accept) {
    return true;
  }

  const acceptedTypes = accept
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return acceptedTypes.some((acceptedType) => {
    if (acceptedType === 'image/*') {
      return fileType.startsWith('image/')
        || IMAGE_FILE_EXTENSIONS.some((extension) => fileName.endsWith(extension));
    }

    if (acceptedType.startsWith('.')) {
      return fileName.endsWith(acceptedType);
    }

    return fileType === acceptedType;
  });
}

function formatFileSizeLimit(maxSizeBytes: number): string {
  if (maxSizeBytes < 1024 * 1024) {
    return `${Math.round(maxSizeBytes / 1024)} KB`;
  }

  const sizeInMegabytes = maxSizeBytes / (1024 * 1024);

  if (Number.isInteger(sizeInMegabytes)) {
    return `${sizeInMegabytes} MB`;
  }

  return `${sizeInMegabytes.toFixed(1)} MB`;
}

export const FileUpload = ({
  onChange,
  multiple = false,
  accept,
  maxSizeBytes,
}: IFileUploadProps) => {
  const inputId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const updateFiles = (nextFiles: File[]) => {
    if (nextFiles.length === 0) {
      return;
    }

    let nextValidationMessage: string | null = null;
    const validFiles = nextFiles.filter((file) => {
      if (!isAcceptedFileType(file, accept)) {
        nextValidationMessage ??= `${file.name} must be an image file.`;
        return false;
      }

      if (maxSizeBytes && file.size > maxSizeBytes) {
        nextValidationMessage ??= `${file.name} must be ${formatFileSizeLimit(maxSizeBytes)} or smaller.`;
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) {
      setValidationMessage(nextValidationMessage);
      return;
    }

    setValidationMessage(nextValidationMessage);
    setFiles((currentFiles) => (multiple ? [...currentFiles, ...validFiles] : validFiles));
    onChange?.(validFiles);
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
        accept={accept}
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

      {validationMessage ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {validationMessage}
        </div>
      ) : null}

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
