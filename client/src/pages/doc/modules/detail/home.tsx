import { uploadFile } from "@/lib/upload";
import { useState } from "react";
export default function DocHome() {
  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const { downloadUrl, fileKey } = await uploadFile({ file, ext: "jpg" });

    setDownloadUrl(downloadUrl);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <input type="file" onChange={handleUpload} />
      <div>
        <img src={downloadUrl} alt="file" />
      </div>
    </div>
  );
}
