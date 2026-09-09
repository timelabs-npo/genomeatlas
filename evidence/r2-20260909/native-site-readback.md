Read-only verification completed. All three native provider reads succeeded.

Local calls:
```powershell
git rev-parse HEAD
Get-Content -LiteralPath 'data/native-site-readback.json' -Raw
```

Current HEAD: `9a4aef2d2fc37fb68803fc7ad0f0490bcd9f5a33`

Actual native calls:
```javascript
mcp__codex_apps__sites_get_site({
  project_id: "appgprj_6aa1709139648191ab998de6fccc4890",
  include_mcp_connection: false
})
mcp__codex_apps__sites_list_site_versions({
  project_id: "appgprj_6aa1709139648191ab998de6fccc4890",
  limit: 1
})
mcp__codex_apps__sites_get_site_version({
  project_id: "appgprj_6aa1709139648191ab998de6fccc4890",
  version_id: "appgprj_6aa1709139648191ab998de6fccc4890~appgver_cc4b09b839f08191b4dcc190b6bc49d4"
})
```

Sanitized current provider results:

| Field | Value |
|---|---|
| Site ID | `appgprj_6aa1709139648191ab998de6fccc4890` |
| Title | GenomeAtlas - Site Helper Suite |
| Live URL | https://genomeatlas-site-helper-suite.hx31337.chatgpt.site |
| Status | `active` |
| Audience | `public` |
| Latest saved version | `4` |
| Version ID | `appgprj_6aa1709139648191ab998de6fccc4890~appgver_cc4b09b839f08191b4dcc190b6bc49d4` |
| Source commit | `87566510d981a2cd7079d1f2b13b6290e00fda9e` |

The saved source commit differs from local HEAD. **No deployment ID or explicit binding between the live URL and saved version was supplied.**

No files, repository state, or Sites were changed. No browser tools were used. Stopped after bounded readback.