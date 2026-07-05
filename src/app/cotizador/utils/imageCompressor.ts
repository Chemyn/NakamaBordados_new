export const compressImage = (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.75
): Promise<{ file: File; preview: string }> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({ file, preview: '' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ file, preview: event.target?.result as string });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ file, preview: event.target?.result as string });
              return;
            }
            
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            const base64Reader = new FileReader();
            base64Reader.onloadend = () => {
              resolve({
                file: compressedFile,
                preview: base64Reader.result as string
              });
            };
            base64Reader.readAsDataURL(blob);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => {
        resolve({ file, preview: event.target?.result as string });
      };
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      resolve({ file, preview: '' });
    };
    reader.readAsDataURL(file);
  });
};
