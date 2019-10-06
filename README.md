# picture-of-the-day-fetcher
A node.js script that fetches pictures form many pictures of the day sites to specific directories

This script is designed to complement Variety. While the app will work with correct configs, you'll be on your own...

It comes with a systemd user service that can be used to periodically run the script every 30 seconds or so...


## Install ##

To install, clone this repo and run this in a terminal:

```
$ npm install
$ sudo npm run build
```

This will build an executable and install it to `/bin`

## Configuration ##

The script uses an ini style config file in `/etc/picture-of-the-day-fetcher.conf`. To add user-specific configurations it's advised to copy the conf file over your home repository:

```
$ cp /etc/picture-of-the-day-fetcher.conf ~/.config/picture-of-the-day-fetcher.conf
```

Here's a list of available configs:

* `AutoScreenResolution` : Controls whenever or not the script will try to fetch the current main display resolution while cleaning the picture repositiries (default : True)
* `ScreenWidth` : The resolution width in pîxels(default : 900) 
* `ScreenHeight` : The resolution height in pîxels(default : 1600) 
* `UseVarietyConfig` : Controls whenever or not the script will use the user's Variety config file to configure itself
* `FetcherDir` : The main directory name. Will be created automatically.
* `DownloadPath` : An absolute path to a background directory. Most of the time will be where Variety saves its backgrounds.
* `DirSizeQuota` : Controls how much a directory can grow until a cleanup is needed in bytes. If the total size of a sub-directory grows above this limit the script will remove the oldest pictures to make more room.
* `UseMinimumSize` : Controls whenever or not the script checks each pictures for size requirements. If a picture is too small it gets deleted. 
* `PicMinimumSizePercents` : A percentage that sets the minimal size limit. For example, if a given picture is smaller than 50% of the resolution's size then it gets deleted.
* `OnlyLandscape` : Controls whenever or not the script deletes portrait aligned pictures.

For each source, there's always these available configs:
* `Url` : The URL to use while fetching the source
* `Dir` : The directory in which to save the fetched pictures

However, the National Geographic configs got two additional configs:
* `AutoDownloadSize` : Controls whenever or not the script will calculate the best picture size based on the screen resolution
* `DownloadSize` : A number that indicates the used picture size while fetching at national geographic