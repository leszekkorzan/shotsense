import cvModule from "@techstark/opencv-js";

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

export const test = async () => {
  const { cv } = await getOpenCv();
  console.log("OpenCV loaded in worker:");
  console.log(cv.getBuildInformation());
  return "Test successful";
};
