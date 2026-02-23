import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
} from '@mui/material';
import { CloudUpload, Delete, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { pdfService } from '@/services/pdf.service';
import toast from 'react-hot-toast';

interface PdfUploaderProps {
  paperId: number;
  onUploadComplete?: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ paperId, onUploadComplete }) => {
  const queryClient = useQueryClient();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, fileId }: { file: File; fileId: string }) => {
      // Update progress to show uploading
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file.name === fileId ? { ...f, progress: 50, status: 'uploading' } : f
        )
      );

      const result = await pdfService.upload(paperId, file);

      // Update progress to complete
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file.name === fileId ? { ...f, progress: 100, status: 'success' } : f
        )
      );

      return result;
    },
    onSuccess: async (data, variables) => {
      // Get current PDFs and add the new one immediately (optimistic update)
      const currentPdfs = queryClient.getQueryData(['pdfs', String(paperId)]);
      if (currentPdfs && data) {
        queryClient.setQueryData(['pdfs', String(paperId)], [...(currentPdfs as any[]), data]);
      }
      
      // Then refetch to ensure server state is correct
      await queryClient.refetchQueries({ 
        queryKey: ['pdfs', String(paperId)],
        type: 'active'
      });
      
      toast.success('PDF uploaded successfully!');
      
      // Remove from uploading list after 2 seconds
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.file.name !== variables.fileId));
      }, 2000);

      onUploadComplete?.();
    },
    onError: (error: any, variables) => {
      const errorMessage = error.response?.data?.message || 'Failed to upload PDF';
      toast.error(errorMessage);

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file.name === variables.fileId
            ? { ...f, status: 'error', error: errorMessage }
            : f
        )
      );
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        // Add to uploading list
        setUploadingFiles((prev) => [
          ...prev,
          {
            file,
            progress: 0,
            status: 'uploading',
          },
        ]);

        // Start upload
        uploadMutation.mutate({ file, fileId: file.name });
      });
    },
    [uploadMutation, paperId]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  });

  const handleRemoveUploadingFile = (fileName: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.file.name !== fileName));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box>
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.3s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CloudUpload sx={{ fontSize: 48, color: 'primary.main' }} />
          <Typography variant="h6" align="center">
            {isDragActive ? 'Drop PDF files here' : 'Drag & drop PDF files here'}
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center">
            or click to browse files
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Supported: PDF files up to 50MB
          </Typography>
        </Box>
      </Paper>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight="bold">
            Some files were rejected:
          </Typography>
          {fileRejections.map(({ file, errors }) => (
            <Typography key={file.name} variant="caption" display="block">
              • {file.name}: {errors.map((e) => e.message).join(', ')}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Uploading Files List */}
      {uploadingFiles.length > 0 && (
        <List sx={{ mt: 2 }}>
          {uploadingFiles.map((uploadingFile) => (
            <ListItem
              key={uploadingFile.file.name}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <ListItemText
                    primary={uploadingFile.file.name}
                    secondary={formatFileSize(uploadingFile.file.size)}
                  />
                  <ListItemSecondaryAction>
                    {uploadingFile.status === 'uploading' && (
                      <Typography variant="caption" color="primary" sx={{ mr: 2 }}>
                        Uploading...
                      </Typography>
                    )}
                    {uploadingFile.status === 'success' && (
                      <CheckCircle color="success" sx={{ mr: 1 }} />
                    )}
                    {uploadingFile.status === 'error' && (
                      <>
                        <ErrorIcon color="error" sx={{ mr: 1 }} />
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveUploadingFile(uploadingFile.file.name)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </ListItemSecondaryAction>
                </Box>

                {/* Progress Bar */}
                {uploadingFile.status === 'uploading' && (
                  <LinearProgress
                    variant="determinate"
                    value={uploadingFile.progress}
                    sx={{ mt: 1 }}
                  />
                )}

                {/* Error Message */}
                {uploadingFile.status === 'error' && uploadingFile.error && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                    {uploadingFile.error}
                  </Typography>
                )}
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};
