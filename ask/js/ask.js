let IP_ADDRESS = "http://35.198.243.45:8080/";
let API_INFO = IP_ADDRESS + "ask/type=username?username=";
let API_MESSAGE = IP_ADDRESS + "ask/questions/new"
toastr.options = {
    "closeButton": true,
    "debug": false,
    "newestOnTop": false,
    "progressBar": false,
    "positionClass": "toast-top-right",
    "preventDuplicates": false,
    "onclick": null,
    "showDuration": "200",
    "hideDuration": "500",
    "timeOut": "3000",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
}
var app = new Vue({
    el: '#app',
    data: {
        user: '',
        message: '',
        isValidUser: ''
    },
    mounted() {
        document.title = "IUDI - USER NOT FOUND";
        var self = this;
        var urlParams = parseURLParams();
        axios({
            method: 'get',
            url: API_INFO + urlParams
        }).then(function(response) {
            if (typeof response.data.data != 'string') {
                self.isValidUser = true;
                self.user = response.data.data;
                $("title", "head").text("IUDI - " + self.user.nickname + " (@" + self.user.username + ") ");
                document.title = "IUDI - " + self.user.nickname + " (@" + self.user.username + ") ";
            } else {
                $("title", "head").text("IUDI - USER NOT FOUND");
                document.title = "IUDI - USER NOT FOUND";
            }
        }).catch(function(error) {
            console.log(error);
        });
    },
    methods: {
        sendMessagePrivate: function() {
            var self = this;
            var textCheck = self.message.trim();
            if (textCheck.length > 0) {
                axios({
                    method: 'post',
                    url: API_MESSAGE,
                    data: {
                        content: self.message,
                        receiver_key: self.user.key,
                        sender_key: "anonymous"
                    }
                }).then(function(response) {
                    toastr.success(response.data.data, 'IUDI');
                    self.message = '';
                }).catch(function(error) {
                    console.log(error);
                });
            }
        }
    }
});

function parseURLParams() {
    var path = window.location.pathname;
    var number = path.match(/\//g);
    if (number.length > 1) {
        var next = path.substring(1, path.length);
        var number2 = next.indexOf("/");
        return path.substring(1, number2 + 1);
    } else {
        return path.substring(1, path.length);
    }
}