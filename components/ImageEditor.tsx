"use client";
import React, { useState, useEffect } from "react";
// import dynamic from "next/dynamic";
import FilerobotImageEditor from "react-filerobot-image-editor";

// // Import động với noSSR
// const FilerobotImageEditor = dynamic(
//   () =>
//     import("react-filerobot-image-editor").then((mod) => {
//       const { TABS, TOOLS } = mod;
//       return mod.default;
//     }),
//   {
//     ssr: false,
//     loading: () => <div>Loading editor...</div>,
//   }
// );


interface ImageEditorProps {
  imgUrl: string;
}

function ImageEditor({ imgUrl }: ImageEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [isImgEditorShown, setIsImgEditorShown] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openImgEditor = () => {
    setIsImgEditorShown(true);
  };

  const closeImgEditor = () => {
    setIsImgEditorShown(false);
  };

  // get name of the file by time
  const getFileName = () => {
    const date = new Date();
    return `image-${date.getTime()}.png`;
  };
  const filename = getFileName();

  // Không render gì cho đến khi component được mount ở client
  if (!mounted) return null;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <FilerobotImageEditor
        source='https://upload.wikimedia.org/wikipedia/commons/6/68/Leo_Messi_%28cropped%29.jpg'
        onSave={(editedImageObject, designState) => {
          console.log("saved", editedImageObject, designState);
          // download file
          let tmpLink = document.createElement("a");
          tmpLink.download = editedImageObject.fullName || "image.jpg";
          tmpLink.href = editedImageObject.imageBase64 || "";
          tmpLink.style.position = "absolute";
          tmpLink.style.zIndex = "-111";
          tmpLink.style.visibility = "none";
          document.body.appendChild(tmpLink);
          tmpLink.click();
          document.body.removeChild(tmpLink);
        }}
        defaultSavedImageName={filename}
        onClose={closeImgEditor}
        annotationsCommon={{
          fill: "#ff0000",
        }}
        Image={{ disableUpload: true }}
        Text={{ text: "Filerobot..." }}
        Rotate={{ angle: 90, componentType: "slider" }}
        Crop={{
          presetsItems: [
            {
              titleKey: "classicTv",
              descriptionKey: "4:3",
              ratio: 4 / 3,
            },
            {
              titleKey: "cinemascope",
              descriptionKey: "21:9",
              ratio: 21 / 9,
            },
          ],
          presetsFolders: [
            {
              titleKey: "socialMedia",
              groups: [
                {
                  titleKey: "facebook",
                  items: [
                    {
                      titleKey: "profile",
                      width: 180,
                      height: 180,
                      descriptionKey: "fbProfileSize",
                    },
                    {
                      titleKey: "coverPhoto",
                      width: 820,
                      height: 312,
                      descriptionKey: "fbCoverPhotoSize",
                    },
                  ],
                },
              ],
            },
          ],
        }}
        tabsIds={["Adjust", "Annotate"]}
        defaultTabId="Annotate"
        defaultToolId="Text"
        savingPixelRatio={4}
        previewPixelRatio={window.devicePixelRatio * 4}
        resetOnImageSourceChange={true}
      />
    </div>
  );
}

export default ImageEditor;
