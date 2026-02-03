import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const { S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION } = process.env;
if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_BUCKET || !S3_REGION) {
  throw new Error(
    'Missing S3 env: S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION'
  );
}

const s3 = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

const bucket = S3_BUCKET;

async function streamToBuffer(
  body: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array> | undefined
): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  if (Symbol.asyncIterator in Object(body)) {
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
  } else {
    const reader = (body as ReadableStream<Uint8Array>).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  }
  return Buffer.concat(chunks);
}

export async function putObject(key: string, data: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    })
  );
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return streamToBuffer(out.Body as AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>);
}

export async function headObject(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'name' in e && e.name === 'NotFound') {
      return false;
    }
    if (
      e &&
      typeof e === 'object' &&
      '$metadata' in e &&
      typeof (e as { $metadata?: { httpStatusCode?: number } }).$metadata === 'object'
    ) {
      const code = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (code === 404) return false;
    }
    throw e;
  }
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
