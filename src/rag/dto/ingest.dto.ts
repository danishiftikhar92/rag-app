export class IngestFilesDto {
  collectionName?: string;
}

export class IngestUrlDto {
  url: string;
  collectionName?: string;
}

export class QueryDto {
  question: string;
  collectionName?: string;
  topK?: number;
}
