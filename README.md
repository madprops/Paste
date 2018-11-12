![](https://i.imgur.com/Bkj0LoW.jpg)

Apache TLS VirtualHost Example:

```
<VirtualHost *:443>
	ServerAdmin admin@example.com
	ServerName paste.domain.com
	DocumentRoot /var/www/paste
	ErrorLog ${APACHE_LOG_DIR}/error.log
	CustomLog ${APACHE_LOG_DIR}/access.log combined
	FallbackResource /index.php
	DirectoryIndex index.php
	SSLCertificateFile /etc/letsencrypt/live/some.domain.com/fullchain.pem
	SSLCertificateKeyFile /etc/letsencrypt/live/some.domain.com/privkey.pem
	Include /etc/letsencrypt/options-ssl-apache.conf
</VirtualHost>
```

You'll probably need to give www-data permission to write to the sqlite database.
