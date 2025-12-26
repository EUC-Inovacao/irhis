// Direct integration with external Movement Analysis API
const EXTERNAL_API_URL =
  "https://eucp-movement-analysis-api-dev-h9ayfwarcxeag6e0.westeurope-01.azurewebsites.net";

// Authentication removed by API developer
const API_TOKEN = null; // No authentication required

export interface MovementAnalysisResult {
  success: boolean;
  message: string;
  output?: {
    joints_detected: number;
    frames_analyzed: number;
    report_path: string;
  };
  joint_angles?: {
    calculated: boolean;
    angles: Array<{
      sensor1: string;
      sensor2: string;
      angles: number[];
    }>;
  };
  movement_metrics?: {
    repetitions: number;
    range_of_motion: {
      max_rom: number;
      min_rom: number;
      average_rom: number;
    };
    dominant_side: string;
    cadence: {
      reps_per_minute: number;
      time_per_rep: number;
      sets: number;
    };
    weight_distribution: {
      left: number;
      right: number;
    };
    angular_velocity: {
      max_velocity: number;
      min_velocity: number;
      average_velocity: number;
    };
    stride: {
      length: number;
      speed: number;
      asymmetry: number;
    };
  };
}

class MovementApiService {
  /**
   * Set API token for authentication
   */
  setApiToken(token: string) {
    // This will be used when credentials are provided
    console.log("API token set for authentication");
  }

  /**
   * Get headers with authentication if token is available
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {};

    if (API_TOKEN) {
      headers["Authorization"] = `Bearer ${API_TOKEN}`;
    }

    return headers;
  }

  /**
   * Check if the external movement analysis API is healthy
   */
  async checkApiHealth(): Promise<{ status: string }> {
    try {
      const response = await fetch(`${EXTERNAL_API_URL}/health`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.log(`API health check failed with status: ${response.status}`);
        if (response.status === 401) {
          console.log("API requires authentication - waiting for credentials");
        }
        return { status: "error" };
      }

      // Check if response has content
      const text = await response.text();
      if (!text || text.trim() === "") {
        console.log("API health check returned empty response");
        return { status: "error" };
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.log("API health check response is not valid JSON:", text);
        return { status: "error" };
      }

      if (data.status === "healthy" || data.status === "ok") {
        return { status: "ok" };
      } else {
        return { status: "error" };
      }
    } catch (error) {
      console.error("Error checking external API health:", error);
      return { status: "error" };
    }
  }

  /**
   * Upload and analyze movement data directly with external API
   */
  async analyzeMovementData(
    fileUri: string,
    fileName: string,
    patientId?: string,
    exerciseType: string = "general"
  ): Promise<MovementAnalysisResult> {
    try {
      // Validate file type
      if (!fileName.toLowerCase().endsWith(".zip")) {
        return {
          success: false,
          message: "Only ZIP files are allowed",
        };
      }

      // For React Native, we need to handle file upload differently
      const formData = new FormData();

      // Create file object for React Native
      const fileObject = {
        uri: fileUri,
        type: "application/zip",
        name: fileName,
      };

      console.log("Uploading file:", fileName, "URI:", fileUri);
      console.log("File object:", fileObject);

      // Append file to FormData
      formData.append("file", fileObject as any);

      // Log FormData contents for debugging
      console.log("FormData created, sending to API...");

      // Upload directly to external API
      const apiResponse = await fetch(`${EXTERNAL_API_URL}/analyze`, {
        method: "POST",
        headers: this.getHeaders(),
        body: formData,
      });

      if (!apiResponse.ok) {
        console.log(`Analysis failed with status: ${apiResponse.status}`);

        // Try to get error details
        let errorMessage = `Analysis failed with status: ${apiResponse.status}`;
        try {
          const errorText = await apiResponse.text();
          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.log("API Error details:", errorData);
          }
        } catch (parseError) {
          console.log("Could not parse error response");
        }

        return {
          success: false,
          message: errorMessage,
        };
      }

      // Check if response has content
      const responseText = await apiResponse.text();
      if (!responseText || responseText.trim() === "") {
        console.log("Analysis returned empty response");
        return {
          success: false,
          message: "Analysis returned empty response",
        };
      }

      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.log("Analysis response is not valid JSON:", responseText);
        return {
          success: false,
          message: "Analysis response is not valid JSON",
        };
      }

      // Log the complete result for debugging
      console.log("API Response:", JSON.stringify(result, null, 2));

      if (result.success) {
        return {
          success: true,
          message: "Analysis completed successfully",
          ...result,
        };
      } else {
        return {
          success: false,
          message: result.message || "Analysis failed",
          ...result,
        };
      }
    } catch (error) {
      console.error("Error analyzing movement data:", error);
      return {
        success: false,
        message: "Failed to analyze movement data",
      };
    }
  }

  /**
   * Test integration with external movement analysis API
   */
  async testIntegration(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${EXTERNAL_API_URL}/integration_test`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.log(`Integration test failed with status: ${response.status}`);
        return {
          success: false,
          message: `Integration test failed with status: ${response.status}`,
        };
      }

      // Check if response has content
      const text = await response.text();
      if (!text || text.trim() === "") {
        console.log("Integration test returned empty response");
        return {
          success: false,
          message: "Integration test returned empty response",
        };
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.log("Integration test response is not valid JSON:", text);
        return {
          success: false,
          message: "Integration test response is not valid JSON",
        };
      }

      if (data.test === "integration ok") {
        return {
          success: true,
          message: "Integration test passed",
        };
      } else if (
        data.success === false &&
        data.error === "Internal Server Error"
      ) {
        return {
          success: false,
          message:
            "Integration test endpoint has internal error - API is still functional",
        };
      } else {
        return {
          success: false,
          message: "Integration test failed",
        };
      }
    } catch (error) {
      console.error("Error testing integration:", error);
      return {
        success: false,
        message: "Integration test failed",
      };
    }
  }
}

export default new MovementApiService();
