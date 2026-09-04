<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title><xsl:value-of select="/rss/channel/title"/> — RSS Feed</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 1rem;
            line-height: 1.6;
            color: #222;
            background: #fff;
            max-width: 680px;
            margin: 0 auto;
            padding: 2rem 1.5rem 4rem;
          }

          header {
            border-bottom: 1px solid #e5e5e5;
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
          }

          header p {
            font-size: 0.8rem;
            color: #888;
            margin-bottom: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
          }

          h1 a {
            color: inherit;
            text-decoration: none;
          }

          h1 a:hover { text-decoration: underline; }

          .description {
            color: #555;
            font-size: 0.95rem;
          }

          .notice {
            background: #f5f5f5;
            border-left: 3px solid #ccc;
            padding: 0.75rem 1rem;
            font-size: 0.85rem;
            color: #555;
            margin-bottom: 2rem;
            border-radius: 0 4px 4px 0;
          }

          .notice a { color: #222; }

          ul {
            list-style: none;
          }

          li {
            padding: 1.25rem 0;
            border-bottom: 1px solid #e5e5e5;
          }

          li:last-child { border-bottom: none; }

          li a {
            font-size: 1.05rem;
            font-weight: 600;
            color: #222;
            text-decoration: none;
          }

          li a:hover { text-decoration: underline; }

          .meta {
            font-size: 0.8rem;
            color: #888;
            margin-top: 0.25rem;
            margin-bottom: 0.5rem;
          }

          .excerpt {
            font-size: 0.9rem;
            color: #555;
          }
        </style>
      </head>
      <body>
        <header>
          <p>RSS Feed</p>
          <h1>
            <a>
              <xsl:attribute name="href"><xsl:value-of select="/rss/channel/link"/></xsl:attribute>
              <xsl:value-of select="/rss/channel/title"/>
            </a>
          </h1>
          <p class="description"><xsl:value-of select="/rss/channel/description"/></p>
        </header>
        <div class="notice">
          This is a web feed. To subscribe, copy the URL from your browser's address bar into a feed reader such as <a href="https://netnewswire.com">NetNewsWire</a>, <a href="https://feedbin.com">Feedbin</a>, or <a href="https://feedly.com">Feedly</a>.
        </div>
        <ul>
          <xsl:for-each select="/rss/channel/item">
            <li>
              <a>
                <xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute>
                <xsl:value-of select="title"/>
              </a>
              <p class="meta">
                <xsl:value-of select="pubDate"/>
                <xsl:if test="dc:creator">
                  <xsl:text> • by </xsl:text>
                  <xsl:for-each select="dc:creator">
                    <xsl:value-of select="."/>
                    <xsl:if test="position() != last()">
                      <xsl:choose>
                        <xsl:when test="position() = last() - 1">
                          <xsl:text> &amp; </xsl:text>
                        </xsl:when>
                        <xsl:otherwise>
                          <xsl:text>, </xsl:text>
                        </xsl:otherwise>
                      </xsl:choose>
                    </xsl:if>
                  </xsl:for-each>
                </xsl:if>
              </p>
              <p class="excerpt"><xsl:value-of select="description"/></p>
            </li>
          </xsl:for-each>
        </ul>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
