import { MulterError } from 'multer';
import { TErrorSources, TGenericErrorResponse } from '../interface/error';

const handleMulterError = (err: MulterError): TGenericErrorResponse => {
  let message = 'File upload error occurred';

  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      message = 'File size is too large. Each image must be within 10MB.';
      break;
    case 'LIMIT_FILE_COUNT':
      message = 'Too many files uploaded. Please reduce the number of files.';
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      message = `Upload limit exceeded or unexpected field '${err.field || 'file'}'. Maximum 10 images are allowed at a time with field name 'portfolio'.`;
      break;
    case 'LIMIT_PART_COUNT':
      message = 'Too many parts uploaded in request.';
      break;
    case 'LIMIT_FIELD_KEY':
      message = 'Field name is too long.';
      break;
    case 'LIMIT_FIELD_VALUE':
      message = 'Field value is too long.';
      break;
    case 'LIMIT_FIELD_COUNT':
      message = 'Too many fields submitted in form data.';
      break;
    default:
      message = err.message || 'File upload failed';
  }

  const errorSources: TErrorSources = [
    {
      path: err.field || 'portfolio',
      message,
    },
  ];

  return {
    statusCode: 400,
    message,
    errorSources,
  };
};

export default handleMulterError;
