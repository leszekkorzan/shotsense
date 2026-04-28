import cvModule from "@techstark/opencv-js";
import type { TargetTemplate } from "@/lib/targets/target-templates";

type CornerPoint = {
  x: number;
  y: number;
};

function createEccReferenceImage(
  cv: typeof cvModule,
  template: TargetTemplate,
  outputSize: number
): cvModule.Mat {
  const reference = new cv.Mat(
    outputSize,
    outputSize,
    cv.CV_8UC1,
    new cv.Scalar(255)
  );
  const center = new cv.Point(outputSize / 2, outputSize / 2);
  const pxPerMm = outputSize / template.canvas_size_mm;
  const blackDiskRadius = Math.max(
    1,
    Math.round((template.anchor_diameter_mm * pxPerMm) / 2)
  );
  const ringThickness = Math.max(1, Math.round(outputSize * 0.0025));

  cv.circle(
    reference,
    center,
    blackDiskRadius,
    new cv.Scalar(0),
    -1,
    cv.LINE_AA
  );

  for (const ring of template.rings) {
    const radius = Math.max(1, Math.round((ring.diameter_mm * pxPerMm) / 2));
    const color = radius <= blackDiskRadius ? 240 : 0;

    cv.circle(
      reference,
      center,
      radius,
      new cv.Scalar(color),
      ringThickness,
      cv.LINE_AA
    );
  }

  return reference;
}

function tryRefineWithEcc(
  cv: typeof cvModule,
  warpedImage: cvModule.Mat,
  template: TargetTemplate,
  outputSize: number
): ImageData {
  const reference = createEccReferenceImage(cv, template, outputSize);
  let warpedGray: cvModule.Mat | undefined;
  let warpedBlurred: cvModule.Mat | undefined;
  let referenceBlurred: cvModule.Mat | undefined;
  let warpedFloat: cvModule.Mat | undefined;
  let referenceFloat: cvModule.Mat | undefined;
  let warpMatrix: cvModule.Mat | undefined;
  let inputMask: cvModule.Mat | undefined;
  let aligned: cvModule.Mat | undefined;

  try {
    warpedGray = new cv.Mat();
    warpedBlurred = new cv.Mat();
    referenceBlurred = new cv.Mat();
    warpedFloat = new cv.Mat();
    referenceFloat = new cv.Mat();

    cv.cvtColor(warpedImage, warpedGray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(
      warpedGray,
      warpedBlurred,
      new cv.Size(5, 5),
      0,
      0,
      cv.BORDER_DEFAULT
    );
    cv.GaussianBlur(
      reference,
      referenceBlurred,
      new cv.Size(5, 5),
      0,
      0,
      cv.BORDER_DEFAULT
    );

    warpedBlurred.convertTo(warpedFloat, cv.CV_32F, 1 / 255.0);
    referenceBlurred.convertTo(referenceFloat, cv.CV_32F, 1 / 255.0);

    warpMatrix = cv.Mat.eye(2, 3, cv.CV_32F);
    inputMask = new cv.Mat();

    const criteria = new cv.TermCriteria(
      cv.TermCriteria_COUNT + cv.TermCriteria_EPS,
      40,
      1e-5
    );

    const correlation = cv.findTransformECC(
      referenceFloat,
      warpedFloat,
      warpMatrix,
      cv.MOTION_AFFINE,
      criteria,
      inputMask,
      5
    );

    if (!Number.isFinite(correlation)) {
      throw new Error("ECC alignment did not converge");
    }

    aligned = new cv.Mat();
    cv.warpAffine(
      warpedImage,
      aligned,
      warpMatrix,
      new cv.Size(outputSize, outputSize),
      cv.INTER_LINEAR + cv.WARP_INVERSE_MAP,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255)
    );

    const resultData = new Uint8ClampedArray(aligned.data);
    return new ImageData(resultData, outputSize, outputSize);
  } finally {
    aligned?.delete();
    warpMatrix?.delete();
    inputMask?.delete();
    referenceFloat?.delete();
    warpedFloat?.delete();
    referenceBlurred?.delete();
    warpedBlurred?.delete();
    warpedGray?.delete();
    reference.delete();
  }
}

async function getOpenCv() {
  let cv: typeof cvModule;
  if (cvModule instanceof Promise) {
    cv = await cvModule;
  } else if (cvModule.Mat) {
    cv = cvModule;
  } else {
    await new Promise<void>((resolve) => {
      cvModule.onRuntimeInitialized = () => resolve();
    });
    cv = cvModule;
  }
  return { cv };
}

export async function warpAndCropTarget(
  imageData: ImageData,
  userCorners: CornerPoint[],
  template: TargetTemplate,
  outputSize = 1000
): Promise<ImageData> {
  if (userCorners.length !== 4) {
    throw new Error("warpAndCropTarget expects exactly 4 corner points");
  }

  if (template.canvas_size_mm <= 0 || template.anchor_diameter_mm <= 0) {
    throw new Error("Target template dimensions must be greater than 0");
  }

  const { cv } = await getOpenCv();

  let src: cvModule.Mat | undefined;
  let dst: cvModule.Mat | undefined;
  let srcCoords: cvModule.Mat | undefined;
  let dstCoords: cvModule.Mat | undefined;
  let M: cvModule.Mat | undefined;

  try {
    const pxPerMm = outputSize / template.canvas_size_mm;
    const anchorPx = template.anchor_diameter_mm * pxPerMm;
    const offsetPx = (outputSize - anchorPx) / 2;

    const srcFlat = userCorners.flatMap((point) => [point.x, point.y]);
    const dstFlat = [
      offsetPx,
      offsetPx,
      offsetPx + anchorPx,
      offsetPx,
      offsetPx + anchorPx,
      offsetPx + anchorPx,
      offsetPx,
      offsetPx + anchorPx,
    ];

    src = cv.matFromImageData(imageData);
    dst = new cv.Mat();

    srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, srcFlat);
    dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, dstFlat);
    M = cv.getPerspectiveTransform(srcCoords, dstCoords);

    cv.warpPerspective(
      src,
      dst,
      M,
      new cv.Size(outputSize, outputSize),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255)
    );

    try {
      return tryRefineWithEcc(cv, dst, template, outputSize);
    } catch (error: unknown) {
      console.error(
        "ECC refinement failed, using perspective warp only",
        error
      );
      const resultData = new Uint8ClampedArray(dst.data);
      return new ImageData(resultData, outputSize, outputSize);
    }
  } finally {
    M?.delete();
    dstCoords?.delete();
    srcCoords?.delete();
    dst?.delete();
    src?.delete();
  }
}
