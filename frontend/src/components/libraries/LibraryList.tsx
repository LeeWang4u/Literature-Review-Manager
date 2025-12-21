import React, { useState } from 'react';
import { Library } from '@/types';
import { 
  Folder as FolderIcon,
  Edit as PencilIcon,
  Delete as TrashIcon,
  ChevronRight as ChevronRightIcon,
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material';

interface LibraryListProps {
  libraries: Library[];
  selectedLibraryId: number | null;
  onSelectLibrary: (library: Library) => void;
  onEditLibrary: (library: Library) => void;
  onDeleteLibrary: (library: Library) => void;
}

export const LibraryList: React.FC<LibraryListProps> = ({
  libraries,
  selectedLibraryId,
  onSelectLibrary,
  onEditLibrary,
  onDeleteLibrary,
}) => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Libraries</h2>
        <div className="space-y-1">
          {libraries.map((library) => {
            const isSelected = library.id === selectedLibraryId;
            const isHovered = library.id === hoveredId;

            return (
              <div
                key={library.id}
                className={`group relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
                onMouseEnter={() => setHoveredId(library.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectLibrary(library)}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {isSelected ? (
                    <FolderOpenIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  ) : (
                    <FolderIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-sm font-medium truncate ${
                          isSelected ? 'text-blue-900' : 'text-gray-900'
                        }`}
                      >
                        {library.name}
                      </span>
                      {library.isDefault && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0">
                          Default
                        </span>
                      )}
                    </div>
                    {library.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {library.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons - show on hover for non-default libraries */}
                {!library.isDefault && (isHovered || isSelected) && (
                  <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLibrary(library);
                      }}
                      className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                      title="Edit library"
                    >
                      <PencilIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLibrary(library);
                      }}
                      className="p-1.5 rounded hover:bg-red-100 transition-colors"
                      title="Delete library"
                    >
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                )}

                {/* For default library, show edit button only (description can be edited) */}
                {library.isDefault && (isHovered || isSelected) && (
                  <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLibrary(library);
                      }}
                      className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                      title="Edit description"
                    >
                      <PencilIcon className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                )}

                {isSelected && (
                  <ChevronRightIcon className="h-4 w-4 text-blue-600 ml-2 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
