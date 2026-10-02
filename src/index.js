export default {
  async fetch(request, env) {
    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    if (request.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          message: "শুধুমাত্র POST request অনুমোদিত।"
        },
        405
      );
    }

    try {
      const contentType = request.headers.get("content-type") || "";

      if (!contentType.includes("multipart/form-data")) {
        return jsonResponse(
          {
            success: false,
            message: "Invalid request format."
          },
          400
        );
      }

      const formData = await request.formData();

      const image = formData.get("image");

      if (!image || typeof image === "string") {
        return jsonResponse(
          {
            success: false,
            message: "কোনো image পাওয়া যায়নি।"
          },
          400
        );
      }

      // Basic validation
      if (!image.type.startsWith("image/")) {
        return jsonResponse(
          {
            success: false,
            message: "শুধুমাত্র image file আপলোড করা যাবে।"
          },
          400
        );
      }

      // 10 MB maximum
      if (image.size > 10 * 1024 * 1024) {
        return jsonResponse(
          {
            success: false,
            message: "Image size সর্বোচ্চ 10MB হতে পারবে।"
          },
          400
        );
      }

      // ImgBB FormData
      const uploadData = new FormData();

      uploadData.append("image", image);

      // IMPORTANT:
      // API KEY only exists inside Cloudflare Worker environment.
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(env.IMGBB_API_KEY)}`,
        {
          method: "POST",
          body: uploadData
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error("ImgBB Error:", result);

        return jsonResponse(
          {
            success: false,
            message: "ImgBB থেকে image upload করা যায়নি।"
          },
          502
        );
      }

      return jsonResponse({
        success: true,
        data: {
          url: result.data.url,
          display_url: result.data.display_url,
          delete_url: result.data.delete_url || null
        }
      });

    } catch (error) {
      console.error("Worker Error:", error);

      return jsonResponse(
        {
          success: false,
          message: "Server-side upload error হয়েছে।"
        },
        500
      );
    }
  }
};


function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://seller.ghotimarket.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}


function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...corsHeaders()
    }
  });
}
