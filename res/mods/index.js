﻿if (!(document.location.pathname === "/config" || document.location.pathname === "/config.html")) {
    if ((JSON.parse(sessionStorage.getItem("user")) || {}).role === 100) {
        location.href = "/config";
    }
}

layui.define(['layer', 'laytpl', 'form', 'element', 'upload', 'util'], function(exports){

  var $ = layui.jquery
  ,layer = layui.layer
  ,laytpl = layui.laytpl
  ,form = layui.form
  ,element = layui.element
  ,upload = layui.upload
  ,util = layui.util
  ,device = layui.device()

  ,DISABLED = 'layui-btn-disabled';

  //阻止IE7以下访问
  if(device.ie && device.ie < 8){
    layer.alert('如果您非得使用 IE 浏览器访问Fly社区，那么请使用 IE8+');
  }

  layui.focusInsert = function(obj, str){
    var result, val = obj.value;
    obj.focus();
    if(document.selection){ //ie
      result = document.selection.createRange();
      document.selection.empty();
      result.text = str;
    } else {
      result = [val.substring(0, obj.selectionStart), str, val.substr(obj.selectionEnd)];
      obj.focus();
      obj.value = result.join('');
    }
  };


  //数字前置补零
  layui.laytpl.digit = function(num, length, end){
    var str = '';
    num = String(num);
    length = length || 2;
    for(var i = num.length; i < length; i++){
      str += '0';
    }
    return num < Math.pow(10, length) ? str + (num|0) : num;
  };

  var fly = {

    //Ajax
    json: function(url, data, success, options){
      var that = this, type = typeof data === 'function';

      if(type){
        options = success
        success = data;
        data = {};
      }

      options = options || {};

      return $.ajax({
        type: options.type || 'post',
        dataType: options.dataType || 'json',
        data: data,
        url: url,
        success: function(res){
          if(res.status === 0) {
            success && success(res);
          } else {
            layer.msg(res.msg || res.code, {shift: 6});
            options.error && options.error();
          }
        }, error: function(e){
          layer.msg('请求异常，请重试', {shift: 6});
          options.error && options.error(e);
        }
      });
    },

    api: function(url, data, success, options){
      const type = typeof data === 'function';

      if(type){
        options = success
        success = data;
        data = {};
      }

      options = options || {};

      return $.ajax({
        type: options.type || 'post',
        dataType: options.dataType || 'json',
        contentType: options.contentType || 'application/json;charset=utf-8',
        headers: {
          "Authorization": sessionStorage.getItem("token")
        },
        url: url,
        data: options.type === 'get' ? data : JSON.stringify(data),
        success: function(res){
          if(res.success === true) {
            success && success(res);
          } else {
            layer.msg(res.msg || res.code, {icon: 5, anim: 6});
            options.error && options.error();
          }
        }, error: function(e){
          layer.msg('请求异常, 请重试!', {icon: 5, anim: 6});
          options.error && options.error(e);
        }
      });
    },

    //计算字符长度
    charLen: function(val){
      var arr = val.split(''), len = 0;
      for(var i = 0; i <  val.length ; i++){
        arr[i].charCodeAt(0) < 299 ? len++ : len += 2;
      }
      return len;
    },

    form: {},

    //简易编辑器
    layEditor: function(options){
      var html = ['<div class="layui-unselect fly-edit">'
        ,'<span type="face" title="插入表情"><i class="iconfont icon-yxj-expression" style="top: 1px;"></i></span>'
        ,'<span type="picture" title="插入图片：img[src]"><i class="iconfont icon-tupian"></i></span>'
        ,'<span type="href" title="超链接格式：a(href)[text]"><i class="iconfont icon-lianjie"></i></span>'
        ,'<span type="code" title="插入代码或引用"><i class="iconfont icon-emwdaima" style="top: 1px;"></i></span>'
        ,'<span type="hr" title="插入水平线">hr</span>'
        ,'<span type="yulan" title="预览"><i class="iconfont icon-yulan1"></i></span>'
      ,'</div>'].join('');

      var log = {}, mod = {
        face: function(editor, self){ //插入表情
          var str = '', ul, face = fly.faces;
          for(var key in face){
            str += '<li title="'+ key +'"><img src="'+ face[key] +'"></li>';
          }
          str = '<ul id="LAY-editface" class="layui-clear">'+ str +'</ul>';
          layer.tips(str, self, {
            tips: 3
            ,time: 0
            ,skin: 'layui-edit-face'
          });
          $(document).on('click', function(){
            layer.closeAll('tips');
          });
          $('#LAY-editface li').on('click', function(){
            var title = $(this).attr('title') + ' ';
            layui.focusInsert(editor[0], 'face' + title);
          });
        }
        ,picture: function(editor){ //插入图片
          layer.open({
            type: 1
            ,id: 'fly-jie-upload'
            ,title: '插入图片'
            ,area: 'auto'
            ,shade: false
            ,area: '465px'
            ,fixed: false
            ,offset: [
              editor.offset().top - $(window).scrollTop() + 'px'
              ,editor.offset().left + 'px'
            ]
            ,skin: 'layui-layer-border'
            ,content: ['<ul class="layui-form layui-form-pane" style="margin: 20px;">'
              ,'<li class="layui-form-item">'
                ,'<label class="layui-form-label">URL</label>'
                ,'<div class="layui-input-inline">'
                    ,'<input required name="image" placeholder="支持直接粘贴远程图片地址" value="" class="layui-input">'
                  ,'</div>'
                  // ,'<button type="button" class="layui-btn layui-btn-primary" id="uploadImg"><i class="layui-icon">&#xe67c;</i>上传图片</button>'
              ,'</li>'
              ,'<li class="layui-form-item" style="text-align: center;">'
                ,'<button type="button" lay-submit lay-filter="uploadImages" class="layui-btn">确认</button>'
              ,'</li>'
            ,'</ul>'].join('')
            ,success: function(layero, index){
              var image =  layero.find('input[name="image"]');

              //执行上传实例
              upload.render({
                elem: '#uploadImg'
                ,url: '/api/upload/'
                ,size: 200
                ,done: function(res){
                  if(res.status == 0){
                    image.val(res.url);
                  } else {
                    layer.msg(res.msg, {icon: 5});
                  }
                }
              });

              form.on('submit(uploadImages)', function(data){
                var field = data.field;
                if(!field.image) return image.focus();
                layui.focusInsert(editor[0], 'img['+ field.image + '] ');
                layer.close(index);
              });
            }
          });
        }
        ,href: function(editor){ //超链接
          layer.prompt({
            title: '请输入合法链接'
            ,shade: false
            ,fixed: false
            ,id: 'LAY_flyedit_href'
            ,offset: [
              editor.offset().top - $(window).scrollTop() + 'px'
              ,editor.offset().left + 'px'
            ]
          }, function(val, index, elem){
            if(!/^http(s*):\/\/[\S]/.test(val)){
              layer.tips('这根本不是个链接，不要骗我。', elem, {tips:1})
              return;
            }
            layui.focusInsert(editor[0], ' a('+ val +')['+ val + '] ');
            layer.close(index);
          });
        }
        ,code: function(editor){ //插入代码
          layer.prompt({
            title: '请贴入代码或任意文本'
            ,formType: 2
            ,maxlength: 10000
            ,shade: false
            ,id: 'LAY_flyedit_code'
            ,area: ['800px', '360px']
          }, function(val, index, elem){
            layui.focusInsert(editor[0], '[pre]\n'+ val + '\n[/pre]');
            layer.close(index);
          });
        }
        ,hr: function(editor){ //插入水平分割线
          layui.focusInsert(editor[0], '[hr]');
        }
        ,yulan: function(editor){ //预览
          var content = editor.val();

          content = /^\{html\}/.test(content)
            ? content.replace(/^\{html\}/, '')
          : fly.content(content);

          layer.open({
            type: 1
            ,title: '预览'
            ,shade: false
            ,area: ['100%', '100%']
            ,scrollbar: false
            ,content: '<div class="detail-body" style="margin:20px;">'+ content +'</div>'
          });
        }
      };

      layui.use('face', function(face){
        options = options || {};
        fly.faces = face;
        $(options.elem).each(function(index){
          var that = this, othis = $(that), parent = othis.parent();
          parent.prepend(html);
          parent.find('.fly-edit span').on('click', function(event){
            var type = $(this).attr('type');
            mod[type].call(that, othis, this);
            if(type === 'face'){
              event.stopPropagation()
            }
          });
        });
      });

    },

    escape: function(html){
      return String(html||'').replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    },

    //内容转义
    content: function(content){
      //支持的html标签
      var html = function(end){
        return new RegExp('\\n*\\['+ (end||'') +'(pre|hr|div|span|p|table|thead|th|tbody|tr|td|ul|li|ol|li|dl|dt|dd|h2|h3|h4|h5)([\\s\\S]*?)\\]\\n*', 'g');
      };
      content = fly.escape(content||'') //XSS
      .replace(/img\[([^\s]+?)\]/g, function(img){  //转义图片
        return '<img src="' + img.replace(/(^img\[)|(\]$)/g, '') + '">';
      }).replace(/@(\S+)(\s+?|$)/g, '@<a href="javascript:;" class="fly-aite">$1</a>$2') //转义@
      .replace(/face\[([^\s\[\]]+?)\]/g, function(face){  //转义表情
        var alt = face.replace(/^face/g, '');
        return '<img alt="'+ alt +'" title="'+ alt +'" src="' + fly.faces[alt] + '">';
      }).replace(/a\([\s\S]+?\)\[[\s\S]*?\]/g, function(str){ //转义链接
        var href = (str.match(/a\(([\s\S]+?)\)\[/)||[])[1];
        var text = (str.match(/\)\[([\s\S]*?)\]/)||[])[1];
        if(!href) return str;
        var rel =  /^(http(s)*:\/\/)\b(?!(\w+\.)*(sentsin.com|layui.com))\b/.test(href.replace(/\s/g, ''));
        return '<a href="'+ href +'" target="_blank"'+ (rel ? ' rel="nofollow"' : '') +'>'+ (text||href) +'</a>';
      }).replace(html(), '\<$1 $2\>').replace(html('/'), '\</$1\>') //转移HTML代码
      .replace(/\n/g, '<br>') //转义换行
      return content;
    },

    //新消息通知
    newmsg: function () {
      let elemUser = $('.fly-nav-user');
      if (sessionStorage.getItem("user") && elemUser[0]) {
        fly.api(
            'http://localhost:8081/message/get_count',
            {},
            res => {
              if (res.illegal) {
                layer.msg(res.msg, {shift: 6});
                setTimeout(() => {
                  this.logout();
                }, 1500)
                return;
              }

              if (res.count > 0) {
                let msg = $('<a class="fly-nav-msg" href="javascript:;">' + res.count + '</a>');
                elemUser.append(msg);

                layer.tips('你有 ' + res.count + ' 条未读消息', msg, {
                  tips: 3,
                  tipsMore: true,
                  fixed: true
                });

                msg.on('mouseenter', () => {
                  layer.closeAll('tips');
                });

                msg.on('click', () => {
                  location.href = '/user/message.html';
                });
              }
            },
            {type: "get"}
        );
      }
      return arguments.callee;
    },

    // 下面开始是自己定义的

    logout() {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      location.href = "/";
    },

    disabled(element) {
      $(element).addClass("layui-btn-disabled");
      $(element).attr('disabled', true);
    },

    enabled(element) {
      $(element).removeClass("layui-btn-disabled");
      $(element).attr('disabled', false);
    }

  };

  //相册
  if($(window).width() > 750){
    layer.photos({
      photos: '.photos'
      ,zIndex: 9999999999
      ,anim: -1
    });
  } else {
    $('body').on('click', '.photos img', function(){
      window.open(this.src);
    });
  }

  //新消息通知
  if (document.baseURI !== "http://127.0.0.1:8090/user/message.html") {
    fly.newmsg();
  }

  setInterval(() => {
    //新消息通知
    if (document.baseURI !== "http://127.0.0.1:8090/user/message.html") {
      fly.newmsg();
    }
  }, 120000)

  //发送激活邮件
  fly.activate = function(email){
    fly.json('/api/activate/', {}, function(res){
      if(res.status === 0){
        layer.alert('已成功将激活链接发送到了您的邮箱，接受可能会稍有延迟，请注意查收。', {
          icon: 1
        });
      };
    });
  };
  $('#LAY-activate').on('click', function(){
    fly.activate($(this).attr('email'));
  });

  //点击@
  $('body').on('click', '.fly-aite', function(){
    var othis = $(this), text = othis.text();
    if(othis.attr('href') !== 'javascript:;'){
      return;
    }
    text = text.replace(/^@|（[\s\S]+?）/g, '');
    othis.attr({
      href: '/jump?username='+ text
      ,target: '_blank'
    });
  });

  //表单提交
  form.on('submit(*)', function(data){
    var action = $(data.form).attr('action'), button = $(data.elem);
    fly.json(action, data.field, function(res){
      var end = function(){
        if(res.action){
          location.href = res.action;
        } else {
          fly.form[action||button.attr('key')](data.field, data.form);
        }
      };
      if(res.status == 0){
        button.attr('alert') ? layer.alert(res.msg, {
          icon: 1,
          time: 10*1000,
          end: end
        }) : end();
      };
    });
    return false;
  });

  //加载特定模块
  if(layui.cache.page && layui.cache.page !== 'index'){
    var extend = {};
    extend[layui.cache.page] = layui.cache.page;
    layui.extend(extend);
    layui.use(layui.cache.page);
  }

  //加载IM
  if(!device.android && !device.ios){
    //layui.use('im');
  }

  //加载编辑器
  fly.layEditor({
    elem: '.fly-editor'
  });

  //手机设备的简单适配
  var treeMobile = $('.site-tree-mobile')
  ,shadeMobile = $('.site-mobile-shade')

  treeMobile.on('click', function(){
    $('body').addClass('site-mobile');
  });

  shadeMobile.on('click', function(){
    $('body').removeClass('site-mobile');
  });

  //获取统计数据
  $('.fly-handles').each(function(){
    var othis = $(this);
    $.get('/api/handle?alias='+ othis.data('alias'), function(res){
      othis.html('（下载量：'+ res.number +'）');
    })
  });

  //固定Bar
  util.fixbar({
    bar1: '&#xe642;'
    ,bgcolor: '#009688'
    ,click: function(type){
      if(type === 'bar1'){
        location.href = '/jie/add.html';
      }
    }
  });

  exports('fly', fly);

});

