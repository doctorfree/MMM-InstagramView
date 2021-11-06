/* Magic Mirror
 * Module: MMM-InstagramView
 *
 * Author: Ronald Joe Record
 * Based on MMM-Instagram2020 by Alexander Salter
 * MIT Licensed.
 */

Module.register("MMM-InstagramView", {
    // Default module config
    defaults: {
        format: 'json',
        lang: 'en-us',
        client_id: '',           // Facebook Instagram App ID
        client_secret: '',       // Facebook Instagram App Secret 
        redirect_uri: '',        // Facebook Instagram App redirect_uri
        auth_code: '',
        access_token: '',
        showChildren: true,
        showComments: true,
        showDate: true,
        showMediaType: false,
        animationSpeed: 5000,    // 5 seconds
        updateInterval: 60000,   // 60 seconds
    },
    
    // Start Module
    start: function() {
        var self = this;
        Log.log('Starting module: ' + this.name);
        self.stage = "load";
        self.images = {};
        self.authorise_url = '';
        self.activeItem = 0;
        self.sendSocketNotification('MMM-InstagramView-CONFIG', this.config);
        setTimeout(function (){
            self.doAuthentication();
        },10);
    },    

    // Override dom generator
    getDom: function() {
        var self = this;
        var wrapper = document.createElement("div");
        wrapper.classList.add("small");
        var imageDisplay = document.createElement('div');
        var instaPost = document.createElement('div');
        self.haveVideo = false;
        
        if (self.stage === "load" || self.stage === "load_images") {
            Log.log("Loading Placeholder");
            instaPost.id = "MMM-Instagram-image";
            instaPost.innerHTML = "<img src='" + self.data.path + "ig_placeholder.png' width='100%'>";
            instaPost.innerHTML += "<p class='light' style='text-align: center;'>Loading Instagram Feed</p>";
        }
        else if (self.stage === "auth_link") {
            Log.log("Loading Pre Auth Page");
            instaPost.id = "MMM-Instagram-image";
            instaPost.innerHTML += "<p class='light' style='text-align: center;'>Click <A HREF='"+self.authorise_url+"' target='_new'>HERE</A> to authorise access to your instagram account.</p>";
        }
        else if (self.stage === "show_images") {
            Log.log("Loading Images");
            if (self.activeItem >= self.images.photo.length) {
                self.activeItem = 0;
            }
            if (typeof self.images.photo[self.activeItem] != 'undefined') {
              var tmpMedia = self.images.photo[self.activeItem];
              instaPost.id = "MMM-Instagram-image";
              if (tmpMedia.type == 'VIDEO') {
                self.haveVideo = true;
                self.video = document.createElement("VIDEO");
                self.video.id = "MMM-Instagram-video";
                self.video.setAttribute("src", tmpMedia.photolink);
                self.video.setAttribute("type", "video/mp4");
                self.video.setAttribute("width", "100%");
                self.video.setAttribute("autoplay", true);
                instaPost.innerHTML = "";
              } else {
                instaPost.innerHTML =
                  "<img src='" + tmpMedia.photolink + "' width='100%'>";
              }
              if (self.config.showComments) {
                instaPost.innerHTML += "<p class='light' style='font-weight: bold;font-size:30px;text-align: center;'>"+tmpMedia.caption+"</p>";
              }
              if (self.config.showDate) {
                instaPost.innerHTML += "<p class='light xsmall' style='font-size:24px;text-align: center;'>"+tmpMedia.timestamp+"</p>";
              }
              if (self.config.showMediaType) {
                instaPost.innerHTML += "<p class='light xsmall' style='font-size:18px;text-align: center;'>"+tmpMedia.type+"</p>";
              }
            }
        }
        if (self.haveVideo) {
            imageDisplay.appendChild(self.video);
            imageDisplay.appendChild(instaPost);
        } else {
            imageDisplay.appendChild(instaPost);
        }
        wrapper.appendChild(imageDisplay);
        return wrapper;
    },
    
    getStyles: function() {
        return ['instagram.css', 'font-awesome.css'];
    },
    
    doAuthentication: function() {
        var self = this;
        Log.log(self.name + ' sending INSTAGRAM_AUTH notification');
        self.sendSocketNotification("INSTAGRAM_AUTH", null);
    },
     
    scheduleUpdateInterval: function() {
        var self = this;
        Log.info("Scheduled update interval set up...");
        self.updateDom(self.config.animationSpeed);
        setInterval(function() {
            Log.info("incrementing the activeItem and refreshing");
            self.activeItem++;
            self.updateDom(self.config.animationSpeed);
        }, this.config.updateInterval);
    },

    // override socketNotificationReceived
    socketNotificationReceived: function(notification, payload) {
        var self = this;
        Log.log('socketNotificationReceived: ' + notification);
        if (notification === 'INSTAGRAM_ACCESS_TOKEN')
        {
            Log.log('received INSTAGRAM_ACCESS_TOKEN: ' + payload);
            self.config.access_token = payload;
            if (payload != "") {
                // Token Exisits
                Log.log('Token Exists in accesstoken.cfg');
                self.stage = "load_images";
                self.config.access_token = payload;
                Log.log(self.name + ' sending INSTAGRAM_AUTH_REFRESH notification');
                self.sendSocketNotification("INSTAGRAM_AUTH_REFRESH", null);
            }
            else {
                // Token Does Not Exisit
                Log.log('Token Does Not Exist in accesstoken.cfg');
                if (self.config.auth_code != "") {
                    //Auth Code Exisits
                    Log.log('Auth Code Exists in config.js');
                    self.stage = "auth_exchange";
                    self.sendSocketNotification('INSTAGRAM_AUTH_EXCHANGE', null);
                } else {
                    //Auth Code Does Not Exisit
                    Log.log('Auth Code Does Not Exist in config.js');
                    self.stage = "auth_link";
                    self.sendSocketNotification('INSTAGRAM_AUTH_NEW', null);
                    self.updateDom(self.config.animationSpeed);
                }
                self.sendSocketNotification('MMM-InstagramView-CONFIG', this.config);
            }
        }
        else if (notification === 'INSTAGRAM_ACCESS_TOKEN_NEW') {
            Log.log('received INSTAGRAM_ACCESS_TOKEN_NEW: ' + payload);
            if (payload != "") {
                //Token Exisits
                Log.log('Token Exists in accesstoken.cfg');
                self.stage = "load_images";
                self.config.access_token = payload;
                setTimeout(function (){
                    self.sendSocketNotification("INSTAGRAM_MEDIA_REFRESH", null);
                },10);
            }
            else {
                //Token Does Not Exisit
                Log.log('Token Does Not Exist in accesstoken.cfg');
                if (self.config.auth_code != "") {
                    //Auth Code Exisits
                    Log.log('Auth Code Exists in config.js');
                    self.stage = "auth_exchange";
                    self.sendSocketNotification('INSTAGRAM_AUTH_EXCHANGE', null);
                }
                else {
                    //Auth Code Does Not Exisit
                    Log.log('Auth Code Does Not Exist in config.js');
                    self.stage = "auth_link";
                    self.sendSocketNotification('INSTAGRAM_AUTH_NEW', null);
                    self.updateDom(self.config.animationSpeed);
                }
                self.sendSocketNotification('MMM-InstagramView-CONFIG', this.config);
            }
        }
        else if (notification === 'INSTAGRAM_AUTH_URL') {
            Log.log('received INSTAGRAM_AUTH_URL: ' + payload);
            self.authorise_url = payload;
            self.updateDom(self.config.animationSpeed);
        }
        else if (notification === 'INSTAGRAM_IMAGE_ARRAY') {
            Log.log('received INSTAGRAM_IMAGE_ARRAY: ' + payload);
            self.images = payload;
            self.stage = "show_images";
            self.scheduleUpdateInterval();
        }
    }
});
