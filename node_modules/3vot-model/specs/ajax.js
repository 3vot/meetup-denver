describe("Ajax", function(){
  var User;
  var jqXHR;

  beforeEach(function(){
    //_3Model.Ajax.clearQueue();

    User = _3Model.Model.setup("User", ["first", "last"]);
   

  });

  it("can GET a collection on fetch", function(){

    var server = sinon.fakeServer.create();
    
    User.fetch();

    User.one("ajaxSuccess", function(response){ 
      expect(User.first().first).toBe("roberto");
      server.restore();
    })
    
    server.requests[0].respond(
        200,
        { "Content-Type": "application/json" },
        JSON.stringify([{ first: "roberto", last: "Provide examples" }])
    );

  });
  
  
  it("can GET a collection on fetch with query", function(){

    var server = sinon.fakeServer.create();
    
    User.fetch( { query: { fields: ["id", "first", "last"], where: "name = 'test'" } } );

    User.one("ajaxSuccess", function(response){ 
      expect(User.last().first).toBe("carlos");
      expect(response.req.url).toBe("/users?fields=id%2Cfirst%2Clast&where=name%20%3D%20'test'")
      server.restore();
    })
    
    server.requests[0].respond(
        200,
        { "Content-Type": "application/json" },
        JSON.stringify([{ first: "carlos", last: "Provide examples", id: "IDDa" }])
    );

  });
  
  it("can GET a collection on fetch with query in done", function(){

    var server = sinon.fakeServer.create();
    
    var done = function(){
      expect(User.last().first).toBe("carlos");
      server.restore();
    }

    User.fetch( { query: { fields: ["id", "first", "last"], where: "name = 'test'" } }, { done: done } );

    server.requests[0].respond(
        200,
        { "Content-Type": "application/json" },
        JSON.stringify([{ first: "carlos", last: "Provide examples", id: "IDDa" }])
    );

  });
  
  it("can GET a collection on fetch with query in fail", function(){
    
    var fail = function(){
      expect(User.count()).toBe(0);
    }

    User.fetch( { query: { fields: ["id", "first", "last"], where: "name = 'test'" } }, { fail: fail } );
  });
  
  it("can GET a record on fetch", function(){
    var server = sinon.fakeServer.create();
    
    User.refresh([{first: "John", last: "Williams", id: "IDD"}]);

    User.fetch({id: "IDD"});

    User.one("ajaxSuccess", function(response){ 
      expect(response.body.id).toBe("IDD");
      server.restore()
    });
    
    server.requests[0].respond(
      200,
      { "Content-Type": "application/json" },
      JSON.stringify( {first: "John", last: "Williams", id: "IDD"} )
    );

  });

  it("allows undeclared attributes from server", function(){
    User.refresh([{
      id: "12345",
      first: "Hans",
      last: "Zimmer",
      created_by: "rspine_user",
      created_at: "2013-07-14T14:00:00-04:00",
      updated_at: "2013-07-14T14:00:00-04:00"
    }]);

    expect(User.first().created_by).toEqual("rspine_user");
  });
  
  it("should send POST on create and update id", function(){
    var server = sinon.fakeServer.create();

    var res = User.create({first: "Hans", last: "Zimmer", id: "IDD"}, { done: function(){ server.restore(); expect(this.id).toEqual("1") }});

    server.requests[0].respond(
      200,
      { "Content-Type": "application/json" },
      JSON.stringify( {first: "Hans", last: "Zimmer", id: "1"} )
    );

    expect(server.requests[0].method).toEqual("POST");
    expect(server.requests[0].responseText).toEqual('{"first":"Hans","last":"Zimmer","id":"1"}');
    expect(server.requests[0].requestHeaders).toEqual(
      {"Content-Type": "application/json;charset=utf-8",
      "X-Requested-With": "XMLHttpRequest"
      }
    );
    expect(server.requests[0].url).toEqual("/users");

  });

  it("should send PUT on update", function(){
    var server = sinon.fakeServer.create();
    User.refresh([{first: "John", last: "Williams", id: "IDD"}]);
    User.first().first = "John2";
    User.first().last= "Williams2";
    User.first().update( { done: function(){ server.restore(); expect(this.count).toEqual(1) }}  )



    server.requests[0].respond(
      200,
      { "Content-Type": "application/json" },
      JSON.stringify( {first: "John2", last: "Williams2", id: "IDD", count: 1} )
    );
    
  });
  
  it("should send DELETE on destroy", function(){
    var server = sinon.fakeServer.create();
    
    User.refresh([{first: "John", last: "Williams", id: "IDD"}]);

    User.first().destroy( { done: function(){ server.restore(); expect(this.destroyed).toEqual(true);  }})

    server.requests[0].respond(
      200,
      { "Content-Type": "application/json" },
      "{}"
    );

  });
  
  
  it("should call an action", function(done){
    var server = sinon.fakeServer.create();

    callbacks= {
      done: function(){  },
      fail: function(){ console.log(arguments); }
    }
  
    User.callAction("name", {ok: true}, callbacks )

    server.requests[0].respond(
      200,
      { "Content-Type": "application/json" },
      "{}"
    );

  });
  
  it("should call a view", function(){
    var server = sinon.fakeServer.create();

    callbacks= {
      done: function(){ },
      fail: function(){ console.log(arguments); }
    }
  
    User.callView( "name", {ok: true}, callbacks )

    server.requests[0].respond(
      200,
      { "Content-Type": "application/json" },
      "{}"
    );

  });
  
});
