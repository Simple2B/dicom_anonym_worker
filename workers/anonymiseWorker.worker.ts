import {
  anonymizeZip,
  OnProgress,
  ProgressStatus,
} from "../lib/anonymizer/anonymizeZip";
import { ITableData } from "../lib/anonymizer/dicomAnonymizer";

enum AnonymizeWorkerCallbackType {
  progress = "progress",
  dataAnonymized = "dataAnonymized",
  success = "success",
}

self.onmessage = ({ data: { type, payload } }) => {
  console.log(type);
  console.log(payload);

  const onProgressCallback: OnProgress = (
    progress: number,
    status: ProgressStatus,
    error?: string | undefined
  ) => {
    self.postMessage({
      type: AnonymizeWorkerCallbackType.progress,
      fileName: payload.file.name,
      payload: {
        progress,
        status,
        error,
      },
    });
  };

  const onDataAnonymized: (anonymizedData: ITableData) => void = (
    anonymizedData
  ) => {
    self.postMessage({
      type: AnonymizeWorkerCallbackType.dataAnonymized,
      fileName: payload.file.name,
      payload: {
        anonymizedData,
      },
    });
  };

  const onSuccessCallback: (anonymizedZip: Blob) => void = (
    anonymizedZip: Blob
  ) => {
    self.postMessage({
      type: AnonymizeWorkerCallbackType.success,
      fileName: payload.file.name,
      payload: {
        anonymizedZip,
      },
    });
  };
  anonymizeZip(
    payload.file,
    onProgressCallback,
    onDataAnonymized,
    onSuccessCallback
  );
};
export {};
