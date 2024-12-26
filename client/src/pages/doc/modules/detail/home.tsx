import { uploadFile } from "@/lib/upload";

export default function DocHome() {
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileUrl = await uploadFile(file, "jpg");
    console.log(fileUrl);
  };
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <input type="file" onChange={handleUpload} />
    </div>
  );
}
