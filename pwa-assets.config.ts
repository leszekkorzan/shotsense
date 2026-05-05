import {
  AllAppleDeviceNames,
  combinePresetAndAppleSplashScreens,
  defineConfig,
  minimal2023Preset as preset,
} from "@vite-pwa/assets-generator/config";

export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  preset: combinePresetAndAppleSplashScreens(
    preset,
    {
      padding: 0.3,
      resizeOptions: { background: "white", fit: "contain" },
      darkResizeOptions: { background: "#000", fit: "contain" },
      linkMediaOptions: {
        log: true,
        addMediaScreen: true,
        basePath: "/",
        xhtml: false,
      },
    },
    AllAppleDeviceNames
  ),
  images: ["public/favicon.svg"],
});
