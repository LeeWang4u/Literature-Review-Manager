import React, { useState, useEffect } from 'react';
import { Library, CreateLibraryData, UpdateLibraryData } from '@/types';
import { Close as XMarkIcon } from '@mui/icons-material';

interface LibraryFormProps {
  library?: Library | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLibraryData | UpdateLibraryData) => Promise<void>;
}

export const LibraryForm: React.FC<LibraryFormProps> = ({
  library,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!library;
  const isDefaultLibrary = library?.isDefault;

  useEffect(() => {
    if (library) {
      setName(library.name);
      setDescription(library.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setError('');
  }, [library, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() && !isDefaultLibrary) {
      setError('Library name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const data: CreateLibraryData | UpdateLibraryData = isDefaultLibrary
        ? { description } // Only allow editing description for default library
        : { name: name.trim(), description: description.trim() };

      await onSubmit(data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save library');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Library' : 'Create New Library'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {!isDefaultLibrary && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Library Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Machine Learning Papers"
                required
                disabled={isDefaultLibrary}
              />
            </div>
          )}

          {isDefaultLibrary && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
              <p className="text-sm">
                <strong>Note:</strong> You cannot rename the default library, but you can edit its description.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe what this library is for..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
