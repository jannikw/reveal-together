# Reveal Together

Reveal Together is small web app that let's you present markdown based reveal.js presentations together.
This means multiple people will be able to navigate trough the slides while having the currently visible slide synchronized.
It is also possible to have other people simply watch the presentation without being able to change the slides but for themselves.

This is specifically developed to be compatible with presentations created using https://hedgedoc.org/.
While normal reveal.js presentations should work fine, the YAML front matter for configuration is expected in the format HedgeDoc uses.

## Installation

Preferably use the docker image `jannikw/reveal-together:latest` from Docker Hub.

The following options can be specified using environment variables:

| Variable               | Description                                                                                        | Default                  |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ------------------------ |
| `PORT`                 | The port to listen on                                                                              | `8888`                   |
| `PUBLIC_URL`           | The public URL the app can be accessed at. This is used for generating URLs displayed to the user. | `http://localhost:$PORT` |
| `SESSION_DURATION_MIN` | The number of minutes after which a session is cleaned up.                                         | 24 hours                 |

## Development

1. Clone the repository
2. Install the dependencies using `npm install`
3. Start a local instance of the app using `npm start`
