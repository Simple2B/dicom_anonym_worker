import JSZip from "jszip";

import DicomAnonymizer, { ITableData } from "./dicomAnonymizer";

export enum ProgressStatus {
  IN_PROGRESS,
  FINISH,
  SUCCESS,
  ERROR,
}

export type OnProgress = (
  progress: number,
  status: ProgressStatus,
  error?: string
) => void;

export const anonymizeZip = async (
  zipFile: File,
  onProgressCallback: OnProgress,
  onDataAnonymized: (anonymizedData: ITableData) => void,
  onSuccessCallback: (anonymizedZip: Blob) => void
): Promise<Blob | null> => {
  const inputZip = new JSZip();

  try {
    const buffer = await zipFile.arrayBuffer();
    const zipBuf: JSZip = await inputZip.loadAsync(buffer, {
      optimizedBinaryString: true,
    });

    const { files } = zipBuf;

    let fileNumber = 0;
    for (const key in files) {
      const value = files[key];
      if (!value.dir) {
        fileNumber++;
      }
    }

    let fileAmount = 0;
    let dirAmount = 0;
    const outputZip: JSZip = new JSZip();
    let outputBlob: Blob | null = null;

    let progressFiles = 0;
    onProgressCallback(0, ProgressStatus.IN_PROGRESS);

    const requestFS =
      self.requestFileSystemSync || self.webkitRequestFileSystemSync;

    console.log("requestFS", requestFS);

    const fs = requestFS(self.TEMPORARY, 2 ** 32) as LocalFileSystemSync;

    for (const key in files) {
      const value = files[key];
      if (value.dir) {
        const dir = fs.root.getDirectory(key, { create: true });

        dirAmount++;
        console.log("directory", dir.name, key);

        // errorHandler(key, "folder")
      } else {
        ensureFilePathExists(value.name, fs.root);

        const file = fs.root.getFile(key, { create: true });

        const writer = file.createWriter();

        fileAmount++;
        const data: Uint8Array = await value.async("uint8array");
        console.log(data);

        const anonymizer = new DicomAnonymizer(data);
        console.log(anonymizer);

        try {
          const newData = anonymizer.anonymize();
          console.log(newData);

          const blob = new Blob([newData]);
          writer.write(blob);

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          progressFiles === 0 && onDataAnonymized(anonymizer.anonymizedData!);
        } catch (error: any) {
          const message = error.toString();
          if (!message.includes("dicomParser.read")) {
            throw error;
          }
        }
        progressFiles++;
        onProgressCallback(
          (progressFiles / fileNumber) * 100,
          ProgressStatus.IN_PROGRESS
        );
        writer.write(await value.async("blob"));

        // errorHandler(key, "file")
      }
    }
    onProgressCallback(100, ProgressStatus.FINISH);
    for (const key in files) {
      const value = files[key];
      if (!value.dir) {
        const fileEntry = fs.root.getFile(key, { create: false });
        outputZip.file(key, fileEntry.file);
      }
    }
    console.log("finished add all files to zip");

    outputBlob = await outputZip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 3,
      },
    });

    onProgressCallback(100, ProgressStatus.SUCCESS);

    if (!outputBlob) {
      throw new Error("No outputBlob in anonymizer");
    }
    onSuccessCallback(outputBlob);
  } catch (error: any) {
    onProgressCallback(0, ProgressStatus.ERROR, error.message);
    console.error(error);
  }

  return null;
};

const ensureFilePathExists = (fullFilePath: string, fsRoot: any): void => {
  const dirs = fullFilePath.split(/[\\\/]/);
  dirs.pop();
  let folder = fsRoot;
  for (const dir of dirs) {
    try {
      folder = folder.getDirectory(dir, { create: false });
    } catch (error) {
      folder = folder.getDirectory(dir, { create: true });
    }
  }
};
