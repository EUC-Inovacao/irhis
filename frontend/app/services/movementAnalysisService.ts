import axios from "axios";
import * as FileSystem from "expo-file-system";
import { readAsStringAsync } from "expo-file-system/legacy";

// Movement Analysis API Configuration
const MOVEMENT_API_BASE_URL =
  "https://eucp-movement-analysis-api-dev.azurewebsites.net";
const AZURE_TOKEN_URL =
  "https://login.microsoftonline.com/infoeucinovacaoportugal.onmicrosoft.com/oauth2/v2.0/token";

interface MovementAnalysisResponse {
  success: boolean;
  message: string;
  output: {
    joints_detected: number;
    frames_analyzed: number;
    report_path: string;
  };
}

interface AzureTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class MovementAnalysisService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Get Azure Bearer Token for API authentication
   */
  private async getBearerToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        AZURE_TOKEN_URL,
        {
          client_id: "9b73262f-5125-461e-89f3-18f5080dd1c3",
          client_secret: process.env.AZURE_CLIENT_SECRET || "",
          scope: "api://9b73262f-5125-461e-89f3-18f5080dd1c3/.default",
          grant_type: "client_credentials",
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const tokenData: AzureTokenResponse = response.data;
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = Date.now() + tokenData.expires_in * 1000 - 60000; // 1 minute buffer

      return this.accessToken;
    } catch (error) {
      console.error("Error getting bearer token:", error);
      throw new Error("Failed to authenticate with Azure");
    }
  }

  /**
   * Check if the Movement Analysis API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${MOVEMENT_API_BASE_URL}/health`);
      return response.data.status === "ok";
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }

  /**
   * Upload and analyze a ZIP file containing movement data
   */
  async analyzeMovementFile(
    fileUri: string,
    fileName: string
  ): Promise<MovementAnalysisResponse> {
    try {
      // Get authentication token
      const token = await this.getBearerToken();

      // Read file as base64
      const fileContent = await readAsStringAsync(fileUri, {
        encoding: "base64",
      });

      // Convert base64 to blob for upload
      const response = await fetch(`${MOVEMENT_API_BASE_URL}/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: this.createFormData(fileContent, fileName),
      });

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      const result: MovementAnalysisResponse = await response.json();
      return result;
    } catch (error) {
      console.error("Error analyzing movement file:", error);
      throw error;
    }
  }

  /**
   * Create FormData for file upload
   */
  private createFormData(base64Content: string, fileName: string): FormData {
    const formData = new FormData();

    // Convert base64 to blob
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/zip" });

    formData.append("file", blob, fileName);
    return formData;
  }

  /**
   * Get analysis report from the API
   */
  async getAnalysisReport(reportPath: string): Promise<any> {
    try {
      const token = await this.getBearerToken();

      const response = await axios.get(
        `${MOVEMENT_API_BASE_URL}${reportPath}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error getting analysis report:", error);
      throw error;
    }
  }

  /**
   * Test the integration
   */
  async testIntegration(): Promise<boolean> {
    try {
      const token = await this.getBearerToken();

      const response = await axios.get(
        `${MOVEMENT_API_BASE_URL}/integration_test`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data.test === "integration ok";
    } catch (error) {
      console.error("Integration test failed:", error);
      return false;
    }
  }
}

export default new MovementAnalysisService();


