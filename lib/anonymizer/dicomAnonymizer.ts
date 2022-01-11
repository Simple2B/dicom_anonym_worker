import { DataSet, parseDicom } from "dicom-parser";
import { dataDictionary } from "./dataDictionary";
import { listAnonymizedTags } from "./listAnonymizedTags";

export default class DicomAnonymizer {
  private originBuffer: Uint8Array;
  constructor(originBuffer: Uint8Array) {
    this.originBuffer = Uint8Array.from(originBuffer);
  }
  private _anonymizedData?: ITableData;

  get anonymizedData(): ITableData | undefined {
    return this._anonymizedData;
  }

  anonymize = (): Uint8Array => {
    const dicom: DataSet = parseDicom(this.originBuffer);
    for (const element in dicom.elements) {
      // eslint-disable-next-line prefer-const
      let { tag, vr, length, dataOffset } = dicom.elements[element];
      tag = tag.toUpperCase().replace(/X/g, "x");

      if (!vr) {
        vr = dataDictionary[tag].vr;
      }

      if (!(tag in listAnonymizedTags)) {
        continue;
      }

      if (vr in handler && length) {
        handler[vr](dicom, dataOffset, tag, length);
      }
    }
    this._anonymizedData = presentData(dicom);
    return dicom.byteArray;
  };
}

function alterNumber(
  dicom: DataSet,
  offset: number,
  tag: string,
  length: number,
  alterValue: number
) {
  /*
    Alter number string in age, weight, height string to add or minus 1
    whiile keeping the reset of the string
  */

  let alteredStr = "";
  const stringOriginal = dicom.string(tag);
  const numberStringOriginal = stringOriginal.match(/\d+/);

  if (numberStringOriginal != null && numberStringOriginal != undefined) {
    const evenDate = (new Date().getDate() + 1) % 2 == 0;
    const alterNumStr = (
      parseInt(numberStringOriginal?.[0]) +
      (evenDate ? alterValue : -alterValue)
    ).toString();
    alteredStr = stringOriginal.slice(0, numberStringOriginal!.index);
    alteredStr = alteredStr + alterNumStr;
    alteredStr =
      alteredStr +
      stringOriginal.slice(
        numberStringOriginal!.index! + numberStringOriginal![0].length,
        stringOriginal.length
      );

    for (let position = 0; position < length; position++) {
      if (position < alteredStr.length) {
        dicom.byteArray[offset + position] = alteredStr[position].charCodeAt(0);
      } else dicom.byteArray[offset + position] = getReplacedChar();
    }
  }
}

const getReplacedChar = (): number => {
  return "A".charCodeAt(0);
};

const randomDate = (
  start: Date = new Date(0),
  _end: Date = new Date()
): Date => {
  return new Date(start.getTime());
};

const handler: {
  [vr: string]: (
    dicom: DataSet,
    offset: number,
    tag?: string | undefined,
    length?: number
  ) => void;
} = {
  PN: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    for (let position = 0; position < length; position++) {
      dicom.byteArray[offset + position] = getReplacedChar();
    }
  },
  LO: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    for (let position = 0; position < length; position++) {
      dicom.byteArray[offset + position] = getReplacedChar();
    }
  },
  CS: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    for (let position = 0; position < length; position++) {
      dicom.byteArray[offset + position] = getReplacedChar();
    }
  },
  UI: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    const bytes = dicom.byteArray;
    for (let position = 0; position < length; position++) {
      const char: number = bytes[position + offset];
      if (char === 0 || String.fromCharCode(char) === ".") continue;
      bytes[offset + position] = getReplacedChar();
    }
  },
  DA: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    const d = randomDate();
    const dateStr = `${d.getFullYear()}${d
      .getMonth()
      .toString()
      .padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`;
    const bytes = dicom.byteArray;
    const size = Math.min(length, dateStr.length);
    for (let i = 0; i < size; i++) {
      bytes[offset + i] = "A".charCodeAt(i);
    }
  },
  TM: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    const d = randomDate();
    const timeStr = `${d.getHours().toString().padStart(2, "0")}${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}${d.getSeconds().toString().padStart(2, "0")}.${d
      .getMilliseconds()
      .toString()
      .padStart(6, "0")}`;
    const bytes = dicom.byteArray;
    const size = Math.min(length, timeStr.length);
    for (let i = 0; i < size; i++) {
      bytes[offset + i] = "A".charCodeAt(i);
    }
  },
  SH: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    for (let position = 0; position < length; position++) {
      dicom.byteArray[offset + position] = getReplacedChar();
    }
  },
  ST: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    for (let position = 0; position < length; position++) {
      dicom.byteArray[offset + position] = getReplacedChar();
    }
  },
  DT: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    const d = randomDate();
    const dateStr = `${d.getFullYear()}${d
      .getMonth()
      .toString()
      .padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}${d
      .getHours()
      .toString()
      .padStart(2, "0")}${d.getMinutes().toString().padStart(2, "0")}${d
      .getSeconds()
      .toString()
      .padStart(2, "0")}.${d.getMilliseconds().toString().padStart(6, "0")}
      &${d.getHours().toString().padStart(2, "0")}${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}
      `;
    const bytes = dicom.byteArray;
    const size = Math.min(length, dateStr.length);
    for (let i = 0; i < size; i++) {
      bytes[offset + i] = getReplacedChar();
    }
  },

  LT: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    for (let position = 0; position < length; position++) {
      dicom.byteArray[offset + position] = getReplacedChar();
    }
  },
  AS: (dicom: DataSet, offset: number, tag: string | undefined, length = 0) => {
    if (tag == "x00101010") {
      //age
      alterNumber(dicom, offset, tag, length, 1);
    }
  },
  DS: (dicom: DataSet, offset: number, tag: string | undefined, length = 0) => {
    if (tag == "x00101020") {
      //size
      alterNumber(dicom, offset, tag, length, 0.01);
    } else if (tag == "x00101030") {
      //weight
      alterNumber(dicom, offset, tag, length, 0.1);
    }
  },
  UT: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    for (let position = 0; position < length; position++) {
      dicom.byteArray[offset + position] = getReplacedChar();
    }
  },
  AE: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    for (let position = 0; position < length; position++) {
      dicom.byteArray[offset + position] = getReplacedChar();
    }
  },
  OB: (
    dicom: DataSet,
    offset: number,
    _tag: string | undefined,
    length = 0
  ) => {
    for (let position = 0; position < length; position++) {
      dicom.byteArray[offset + position] = getReplacedChar();
    }
  },
};

const presentData = (anonymizedDicom: DataSet): ITableData => {
  const sex = anonymizedDicom.string("x00100040");
  const age = anonymizedDicom.string("x00101010");
  const height = anonymizedDicom.string("x00101020");
  const ethnicGroup = anonymizedDicom.string("x00102160");
  const origin = anonymizedDicom.string("x00102150");
  const imageComments = anonymizedDicom.string("x00204000");
  const weight = anonymizedDicom.string("x00101030");
  const patientHistory = anonymizedDicom.string("x001021B0");

  const dataStructure = Object.keys(anonymizedDicom.elements).map((key) => {
    const tag = dataDictionary[key]?.tag;
    let textCodeDescription = "";

    if (dataDictionary[key]?.tag) {
      if (tag !== undefined) {
        const decodeString = anonymizedDicom.string(tag);

        if (decodeString !== undefined) {
          textCodeDescription = decodeString;
        }
      }
    }

    return {
      [dataDictionary[key]?.name]: textCodeDescription,
    };
  });

  const parsedData: ITableData = {
    sex,
    age,
    height,
    ethnicGroup,
    origin,
    imageComments,
    patientHistory,
    dataStructure,
    weight,
  };
  return parsedData;
};
export interface ITableData {
  sex: string;
  age: string;
  height: string;
  ethnicGroup: string;
  origin: string;
  imageComments: string;
  patientHistory: string;
  dataStructure: {
    [x: string]: string;
  }[];
  weight: string;
}
