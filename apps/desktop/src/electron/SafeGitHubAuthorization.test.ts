import { describe, expect, it } from "vite-plus/test";
import { restrictGitHubAuthorization } from "./SafeGitHubAuthorization.ts";

describe("safe updater credential destinations", () => {
  it.each([
    "https://api.github.com/repos/rakutenanalytics/t3code/releases/latest",
    "https://api.github.com/repos/rakutenanalytics/t3code/releases/assets/12345",
  ])("should retain Authorization for the fixed release API [%s]", (destination) => {
    const headers = { Authorization: "token FAKE_LOGIN", Accept: "application/octet-stream" };

    expect(restrictGitHubAuthorization(destination, headers)).toEqual(headers);
  });

  it.each([
    "https://release-assets.githubusercontent.com/file.zip?signature=FAKE_SIGNATURE",
    "https://objects.githubusercontent.com/file.zip",
    "https://api.github.com/repos/another/repo/releases/latest",
    "https://api.github.com/repos/rakutenanalytics/t3code/issues",
    "https://api.github.com/repos/rakutenanalytics/t3code/releases/assets/12345.blockmap",
    "https://api.github.com:444/repos/rakutenanalytics/t3code/releases/latest",
    "http://api.github.com/repos/rakutenanalytics/t3code/releases/latest",
    "https://github.com/repos/rakutenanalytics/t3code/releases/latest",
  ])(
    "should strip every Authorization spelling for a direct request or redirect to [%s]",
    (destination) => {
      const headers = {
        Authorization: "token FAKE_LOGIN",
        authorization: "token FAKE_LOGIN",
        AUTHORIZATION: "token FAKE_LOGIN",
        Accept: "application/octet-stream",
      };

      const restricted = restrictGitHubAuthorization(destination, headers);

      expect(restricted).toEqual({ Accept: "application/octet-stream" });
      expect(headers.Authorization).toBe("token FAKE_LOGIN");
    },
  );

  it("should remove Authorization when an allowed API request redirects to the CDN", () => {
    const apiHeaders = restrictGitHubAuthorization(
      "https://api.github.com/repos/rakutenanalytics/t3code/releases/assets/12345",
      { Authorization: "token FAKE_LOGIN" },
    );

    const cdnHeaders = restrictGitHubAuthorization(
      "https://release-assets.githubusercontent.com/file.zip",
      apiHeaders,
    );

    expect(cdnHeaders).toEqual({});
  });
});
