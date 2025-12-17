/**
 * Simple, direct download utility for debugging
 * Requirements: 2.5, 4.3
 */

/**
 * Simple direct download function for testing
 */
export function simpleDownload(blob: Blob, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      console.log("Starting simple download:", { filename, blobSize: blob.size });
      
      // Check browser support
      if (!window.URL || !window.URL.createObjectURL) {
        console.error("Browser does not support downloads");
        resolve(false);
        return;
      }
      
      // Create object URL
      const url = URL.createObjectURL(blob);
      console.log("Created object URL:", url);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      console.log("Created download link:", { href: link.href, download: link.download });
      
      // Add to DOM and click
      document.body.appendChild(link);
      console.log("Added link to DOM, triggering click...");
      
      link.click();
      console.log("Click triggered");
      
      // Cleanup after a short delay
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          console.log("Cleanup completed");
          resolve(true);
        } catch (error) {
          console.warn("Cleanup error:", error);
          resolve(true); // Still consider it successful
        }
      }, 1000);
      
    } catch (error) {
      console.error("Simple download error:", error);
      resolve(false);
    }
  });
}

/**
 * Test download with a simple text file
 */
export function testSimpleDownload(): Promise<boolean> {
  const testContent = "This is a test download file.\nGenerated at: " + new Date().toISOString();
  const blob = new Blob([testContent], { type: 'text/plain' });
  const filename = `test-download-${Date.now()}.txt`;
  
  console.log("Testing simple download with:", { filename, content: testContent });
  return simpleDownload(blob, filename);
}