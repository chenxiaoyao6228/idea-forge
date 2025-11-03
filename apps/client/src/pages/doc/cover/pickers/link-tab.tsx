import { Field } from "@/components/forms";
import { Button } from '@idea/ui/shadcn/ui/button';
import { Spinner } from '@idea/ui/base/spinner';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fileApi } from "@/apis/file";
import { useState } from "react";
import { UpdateCoverDto } from "@idea/contracts";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";

// https://media.4-paws.org/9/c/9/7/9c97c38666efa11b79d94619cc1db56e8c43d430/Molly_006-2829x1886-2726x1886-1920x1328.jpg
const schemaFactory = (t: TFunction) =>
  z.object({
    url: z.string().url(t("Please enter a valid URL")),
  });

type FormData = z.infer<ReturnType<typeof schemaFactory>>;

interface LinkTabProps {
  onSelect: (dto: UpdateCoverDto) => Promise<void>;
  onClose: () => void;
}

export function LinkTab({ onSelect, onClose }: LinkTabProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schemaFactory(t) as any),
    defaultValues: {
      url: "",
    },
  });

  const onFormSubmit = async (values: FormData) => {
    try {
      setIsLoading(true);
      const { downloadUrl } = await fileApi.proxyImage({ imageUrl: values.url });
      await onSelect({ url: downloadUrl, isPreset: false });
      onClose();
    } catch (err) {
      form.setError("url", {
        message: t("Failed to load image. Please check the URL and try again."),
      });
      console.error("Error loading image:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
        <Field
          labelProps={{
            children: t("Image URL"),
            className: "sr-only",
          }}
          inputProps={{
            placeholder: t("Paste an image link..."),
            ...form.register("url"),
          }}
          errors={form.formState.errors.url?.message ? [form.formState.errors.url?.message] : []}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Spinner size="sm" text={t("Loading...")} />
            </div>
          ) : (
            t("Submit")
          )}
        </Button>
      </form>
      <p className="mt-4 text-sm text-gray-500 text-center">{t("Works with images from the web.")}</p>
    </div>
  );
}
