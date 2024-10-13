## Hackclub Community playlist

This is for the hackclub community to have a public playlist that they can contribute to.

Slack bot manifest:
```
{
    "display_information": {
        "name": "Hackclub Spotify",
    },
    "features": {
        "bot_user": {
            "display_name": "Hackclub Spotify",
            "always_online": true
        }
    },
    "oauth_config": {
        "redirect_urls": [
            "https://<domain>/slack/callback"
        ],
        "scopes": {
            "user": [
                "identity.avatar",
                "identity.basic",
                "identity.team"
            ]
        }
    },
    "settings": {
        "org_deploy_enabled": false,
        "socket_mode_enabled": false,
        "token_rotation_enabled": false
    }
}
```