import multer from "multer";

const storage = multer.memoryStorage();

const allowedImageTypes = ["image/jpeg", "image/png"];

const allowedIdentityTypes = [...allowedImageTypes, "application/pdf"];

const fileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
  if (file.fieldname === "identityDocument") {
    if (!allowedIdentityTypes.includes(file.mimetype)) {
      callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
      return;
    }

    callback(null, true);
    return;
  }

  if (file.fieldname === "profilePhoto") {
    if (!allowedImageTypes.includes(file.mimetype)) {
      callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
      return;
    }

    callback(null, true);
    return;
  }

  callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 2,
  },
  fileFilter,
});
