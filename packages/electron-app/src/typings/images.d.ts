type S3Config = { cloudfrontUrl: string };
type Image = {
  key: string;
  bucket: string;
  width?: number;
  height?: number;
};

export { S3Config, Image };
