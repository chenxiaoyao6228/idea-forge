import request from "@/lib/request";

export const fileApi = {
  proxyImage: (imageUrl: string) => {
    return request.post("/api/files/proxy-image", { imageUrl });
  },
};
