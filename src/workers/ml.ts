import { InferenceSession, Tensor } from "onnxruntime-web";

const models = ["shotsense-contour-v1.onnx"] as const;
const modelConfigs = {
  "shotsense-contour-v1.onnx": {
    inputSize: 640,
    classes: { 0: "black_contour", 1: "target" },
    confidenceThreshold: 0.25,
  },
} as const satisfies Record<
  (typeof models)[number],
  {
    inputSize: number;
    classes: Record<number, string>;
    confidenceThreshold: number;
  }
>;

type ImageInput = Blob | string;

export type YoloDetection = {
  bbox: [number, number, number, number];
  classId: number;
  confidence: number;
  label: string;
};

export type BlackContourDetection = YoloDetection & {
  imageSize: [number, number];
};

function getModelUrl(modelName: (typeof models)[number]): string {
  return `/models/${modelName}`;
}

const sessionCache: Partial<Record<(typeof models)[number], InferenceSession>> =
  {};

async function loadModel(
  modelName: (typeof models)[number]
): Promise<InferenceSession> {
  if (sessionCache[modelName]) {
    return sessionCache[modelName];
  }

  const modelUrl = getModelUrl(modelName);
  const session = await InferenceSession.create(modelUrl);
  sessionCache[modelName] = session;
  return session;
}

async function getSession(
  modelName: (typeof models)[number]
): Promise<InferenceSession> {
  try {
    const session = await loadModel(modelName);
    return session;
  } catch (error) {
    console.error(`Failed to load model ${modelName}:`, error);
    throw error;
  }
}

function getModelInputName(session: InferenceSession): string {
  const inputName = session.inputNames[0];

  if (!inputName) {
    throw new Error("Model does not expose any inputs");
  }

  return inputName;
}

function getModelInputSize(modelName: (typeof models)[number]): number {
  return modelConfigs[modelName].inputSize;
}

function getModelConfig(modelName: (typeof models)[number]) {
  return modelConfigs[modelName];
}

function getTensorDataView(tensor: Tensor): Float32Array {
  if (tensor.data instanceof Float32Array) {
    return tensor.data;
  }

  const cpuData = (tensor as Tensor & { cpuData?: unknown }).cpuData;

  if (cpuData instanceof Float32Array) {
    return cpuData;
  }

  throw new Error("Unexpected tensor data type from model output");
}

function clampBBox(
  bbox: [number, number, number, number],
  imageWidth: number,
  imageHeight: number
): [number, number, number, number] {
  return [
    Math.max(0, Math.min(imageWidth, bbox[0])),
    Math.max(0, Math.min(imageHeight, bbox[1])),
    Math.max(0, Math.min(imageWidth, bbox[2])),
    Math.max(0, Math.min(imageHeight, bbox[3])),
  ];
}

export function parseYolo26Output(
  output: Tensor,
  modelName: (typeof models)[number]
): YoloDetection[] {
  const config = getModelConfig(modelName);
  const values = getTensorDataView(output);
  const rowSize = 6;

  if (values.length % rowSize !== 0) {
    throw new Error(
      `Unexpected YOLO output size ${values.length}; expected rows of ${rowSize}`
    );
  }

  const detections: YoloDetection[] = [];
  const threshold = config.confidenceThreshold;
  const classNames = config.classes as Record<number, string>;

  for (let offset = 0; offset < values.length; offset += rowSize) {
    const confidence = values[offset + 4];

    if (confidence < threshold) {
      continue;
    }

    const classId = Math.trunc(values[offset + 5]);
    const label = classNames[classId] ?? `class_${classId}`;

    detections.push({
      bbox: [
        values[offset],
        values[offset + 1],
        values[offset + 2],
        values[offset + 3],
      ],
      classId,
      confidence,
      label,
    });
  }

  return detections;
}

function selectBlackContour(detections: YoloDetection[]): YoloDetection | null {
  let bestDetection: YoloDetection | null = null;

  for (const detection of detections) {
    if (detection.classId !== 0) {
      continue;
    }

    if (!bestDetection || detection.confidence > bestDetection.confidence) {
      bestDetection = detection;
    }
  }

  return bestDetection;
}

async function resolveImageBitmap(image: ImageInput): Promise<ImageBitmap> {
  if (typeof image === "string") {
    const response = await fetch(image);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image from ${image}: ${response.status}`
      );
    }

    return createImageBitmap(await response.blob());
  }

  return createImageBitmap(image);
}

function preprocessImage(
  imageBitmap: ImageBitmap,
  targetWidth: number,
  targetHeight: number
): {
  scale: number;
  tensor: Tensor;
  offsetX: number;
  offsetY: number;
} {
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Failed to create canvas context for preprocessing");
  }

  context.fillStyle = "rgb(114, 114, 114)";
  context.fillRect(0, 0, targetWidth, targetHeight);

  const scale = Math.min(
    targetWidth / imageBitmap.width,
    targetHeight / imageBitmap.height
  );
  const resizedWidth = Math.max(1, Math.round(imageBitmap.width * scale));
  const resizedHeight = Math.max(1, Math.round(imageBitmap.height * scale));
  const offsetX = Math.floor((targetWidth - resizedWidth) / 2);
  const offsetY = Math.floor((targetHeight - resizedHeight) / 2);

  context.drawImage(imageBitmap, offsetX, offsetY, resizedWidth, resizedHeight);

  const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
  const { data } = imageData;
  const area = targetWidth * targetHeight;
  const tensorData = new Float32Array(area * 3);

  for (let pixelIndex = 0; pixelIndex < area; pixelIndex += 1) {
    const sourceIndex = pixelIndex * 4;
    tensorData[pixelIndex] = data[sourceIndex] / 255;
    tensorData[area + pixelIndex] = data[sourceIndex + 1] / 255;
    tensorData[area * 2 + pixelIndex] = data[sourceIndex + 2] / 255;
  }

  return {
    scale,
    tensor: new Tensor("float32", tensorData, [
      1,
      3,
      targetHeight,
      targetWidth,
    ]),
    offsetX,
    offsetY,
  };
}

export async function detectBlackContour(
  image: ImageInput
): Promise<BlackContourDetection | null> {
  const modelName = "shotsense-contour-v1.onnx";
  const session = await getSession(modelName);
  const inputName = getModelInputName(session);
  const inputSize = getModelInputSize(modelName);

  const imageBitmap = await resolveImageBitmap(image);
  try {
    const { scale, tensor, offsetX, offsetY } = preprocessImage(
      imageBitmap,
      inputSize,
      inputSize
    );
    const outputs = await session.run({ [inputName]: tensor });
    const outputName = session.outputNames[0];

    if (!outputName) {
      throw new Error("Model does not expose any outputs");
    }

    const output = outputs[outputName];

    if (!output) {
      throw new Error(`Missing output tensor ${outputName}`);
    }

    const detections = parseYolo26Output(output, modelName);
    const bestDetection = selectBlackContour(detections);

    if (!bestDetection) {
      return null;
    }

    const [x1, y1, x2, y2] = bestDetection.bbox;
    const imageBBox = clampBBox(
      [
        (x1 - offsetX) / scale,
        (y1 - offsetY) / scale,
        (x2 - offsetX) / scale,
        (y2 - offsetY) / scale,
      ],
      imageBitmap.width,
      imageBitmap.height
    );

    return {
      ...bestDetection,
      bbox: imageBBox,
      imageSize: [imageBitmap.width, imageBitmap.height],
    };
  } finally {
    imageBitmap.close();
  }
}
