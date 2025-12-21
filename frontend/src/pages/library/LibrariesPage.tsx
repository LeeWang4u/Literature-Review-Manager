import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Library, Paper } from '@/types';
import { libraryService } from '@/services/library.service';
import { paperService } from '@/services/paper.service';
import { LibraryList } from '@/components/libraries/LibraryList';
import { LibraryForm } from '@/components/libraries/LibraryForm';
import {
  Add as PlusIcon,
  Search as MagnifyingGlassIcon,
  Star as StarIcon,
  CalendarToday as CalendarIcon,
  Book as BookOpenIcon,
  Delete as TrashIcon,
} from '@mui/icons-material';
import { Star as StarSolidIcon } from '@mui/icons-material';

const LibrariesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Library | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all libraries
  const { data: libraries = [], isLoading: librariesLoading } = useQuery({
    queryKey: ['libraries'],
    queryFn: libraryService.getAllLibraries,
  });

  // Fetch papers in selected library
  const { data: paperIds = [], isLoading: papersLoading } = useQuery({
    queryKey: ['library-papers', selectedLibrary?.id],
    queryFn: () =>
      selectedLibrary ? libraryService.getPapersInLibrary(selectedLibrary.id) : Promise.resolve([]),
    enabled: !!selectedLibrary,
  });

  // Fetch all papers (to display details)
  const { data: allPapers = [] } = useQuery({
    queryKey: ['papers'],
    queryFn: async () => {
      const response = await paperService.search({});
      return response.data;
    },
  });

  // Filter papers that are in the selected library
  const papersInLibrary: Paper[] = allPapers.filter((paper: Paper) => paperIds.includes(paper.id));

  // Filter by search query
  const filteredPapers = papersInLibrary.filter(
    (paper: Paper) =>
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.authors.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-select first library (My Library) on load
  useEffect(() => {
    if (libraries.length > 0 && !selectedLibrary) {
      setSelectedLibrary(libraries[0]);
    }
  }, [libraries, selectedLibrary]);

  // Mutations
  const createLibraryMutation = useMutation({
    mutationFn: libraryService.createLibrary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      setIsFormOpen(false);
    },
  });

  const updateLibraryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      libraryService.updateLibrary(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      setIsFormOpen(false);
      setEditingLibrary(null);
    },
  });

  const deleteLibraryMutation = useMutation({
    mutationFn: libraryService.deleteLibrary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      setShowDeleteConfirm(null);
      if (selectedLibrary?.id === showDeleteConfirm?.id) {
        setSelectedLibrary(libraries[0] || null);
      }
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, favorite }: { id: number; favorite: boolean }) =>
      paperService.updateStatusAndFavorite(id, { favorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    },
  });

  const removePaperFromLibraryMutation = useMutation({
    mutationFn: ({ libraryId, paperId }: { libraryId: number; paperId: number }) =>
      libraryService.removePaperFromLibrary(libraryId, paperId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-papers'] });
    },
  });

  const handleCreateLibrary = () => {
    setEditingLibrary(null);
    setIsFormOpen(true);
  };

  const handleEditLibrary = (library: Library) => {
    setEditingLibrary(library);
    setIsFormOpen(true);
  };

  const handleDeleteLibrary = (library: Library) => {
    setShowDeleteConfirm(library);
  };

  const handleFormSubmit = async (data: any) => {
    if (editingLibrary) {
      await updateLibraryMutation.mutateAsync({
        id: editingLibrary.id,
        data,
      });
    } else {
      await createLibraryMutation.mutateAsync(data);
    }
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      await deleteLibraryMutation.mutateAsync(showDeleteConfirm.id);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Libraries List */}
      <LibraryList
        libraries={libraries}
        selectedLibraryId={selectedLibrary?.id || null}
        onSelectLibrary={setSelectedLibrary}
        onEditLibrary={handleEditLibrary}
        onDeleteLibrary={handleDeleteLibrary}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 text-size-lg" >
                {selectedLibrary?.name || 'Select a Library'}
              </h1>
              {selectedLibrary?.description && (
                <p className="text-sm text-gray-500 mt-1">{selectedLibrary.description}</p>
              )}
            </div>
            <button
              onClick={handleCreateLibrary}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>New Library</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search papers in this library..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Papers Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {papersLoading || librariesLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <BookOpenIcon className="h-16 w-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">
                {searchQuery ? 'No papers match your search' : 'No papers in this library'}
              </p>
              <p className="text-sm mt-2">
                {searchQuery ? 'Try a different search term' : 'Add papers to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPapers.map((paper) => (
                <div
                  key={paper.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3
                      className="text-lg font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600 flex-1"
                      onClick={() => navigate(`/papers/${paper.id}`)}
                    >
                      {paper.title}
                    </h3>
                    <button
                      onClick={() =>
                        toggleFavoriteMutation.mutate({
                          id: paper.id,
                          favorite: !paper.favorite,
                        })
                      }
                      className="ml-2 flex-shrink-0"
                    >
                      {paper.favorite ? (
                        <StarSolidIcon className="h-5 w-5 text-yellow-400" />
                      ) : (
                        <StarIcon className="h-5 w-5 text-gray-400 hover:text-yellow-400" />
                      )}
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-1">{paper.authors}</p>

                  <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{paper.publicationYear}</span>
                    </div>
                    {paper.journal && (
                      <span className="truncate">{paper.journal}</span>
                    )}
                  </div>

                  {paper.tags && paper.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {paper.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 text-xs rounded-full"
                          style={{
                            backgroundColor: tag.color || '#e5e7eb',
                            color: '#374151',
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                      {paper.tags.length > 3 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                          +{paper.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/papers/${paper.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Details
                    </button>
                    {selectedLibrary && !selectedLibrary.isDefault && (
                      <button
                        onClick={() =>
                          removePaperFromLibraryMutation.mutate({
                            libraryId: selectedLibrary.id,
                            paperId: paper.id,
                          })
                        }
                        className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Library Form Modal */}
      <LibraryForm
        library={editingLibrary}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingLibrary(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Library
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{showDeleteConfirm.name}"? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibrariesPage;
