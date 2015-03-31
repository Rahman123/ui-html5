/*!
Copyright 2015 ManyWho, Inc.
Licensed under the ManyWho License, Version 1.0 (the "License"); you may not use this
file except in compliance with the License.
You may obtain a copy of the License at: http://manywho.com/sharedsource
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied. See the License for the specific language governing
permissions and limitations under the License.
*/

manywho.collaboration = (function (manywho) {

    var socket = null;
    var rooms = {};

    function onDisconnect() {

        for (stateId in rooms) {

            socket.emit('left', { user: rooms[stateId].user, stateId: stateId });

        }

    }

    function onJoined(data) {

        log.info(data.user + ' has joined ' + data.stateId);
        
        manywho.model.addNotification(rooms[data.stateId].flowKey, {
            message: data.user + ' has joined',
            position: 'right',
            type: 'success',
            timeout: '2000',
            dismissible: false
        });

    }

    function onLeft(data) {

        log.info(data.user + ' has left ' + data.flowKey);

        manywho.model.addNotification(rooms[data.stateId].flowKey, {
            message: data.user + ' has left',
            position: 'right',
            type: 'danger',
            timeout: '2000',
            dismissible: false
        });

    }

    function onChange(data) {

        log.info('change to: ' + data.id + ' in ' + data.stateId);

        manywho.state.setComponent(data.id, data.values, rooms[data.stateId].flowKey, false);
        manywho.engine.render(rooms[data.stateId].flowKey);

    }

    function onMove(data) {

        log.info('re-joining ' + data.stateId);

        var flowKey = rooms[data.stateId].flowKey;

        var tenantId = manywho.utils.extractTenantId(flowKey);
        var flowId = manywho.utils.extractFlowId(flowKey);
        var flowVersionId = manywho.utils.extractFlowVersionId(flowKey);
        var stateId = manywho.utils.extractStateId(flowKey);
        var element = manywho.utils.extractElement(flowKey);

        // Re-join the flow here so that we sync with the latest state from the manywho server
        manywho.engine.join(tenantId, flowId, flowVersionId, element, stateId, manywho.state.getAuthenticationToken(flowKey)).then(function () {

            socket.emit('getValues', data);

        });

    }

    function onSync(data) {

        log.info('syncing ' + data.stateId);
        manywho.engine.sync(rooms[data.stateId]);

    }

    function onGetValues(data) {

        log.info('get values from: ' + data.owner + ' in ' + data.stateId);
        socket.emit('setValues', { stateId: data.stateId, id: data.id, components: manywho.state.getComponents(rooms[data.stateId].flowKey) });

    }

    function onSetValues(data) {

        log.info('setting values in ' + data.stateId);
        manywho.state.setComponents(data.components, rooms[data.stateId].flowKey);
        manywho.engine.render(rooms[data.stateId].flowKey);

    }

    return {

        initialize: function (enable, flowKey) {

            if (!socket && enable) {
                
                var stateId = manywho.utils.extractStateId(flowKey);

                rooms[stateId] = {
                    isEnabled: true,
                    flowKey: flowKey
                };

                socket = io.connect(manywho.settings.global('collaboration.uri'));
               
                socket.on('disconnect', onDisconnect);
                socket.on('joined', onJoined);
                socket.on('left', onLeft);
                socket.on('change', onChange);
                socket.on('move', onMove);
                socket.on('sync', onSync);
                socket.on('getValues', onGetValues);
                socket.on('setValues', onSetValues);

                window.addEventListener("beforeunload", function (event) {

                    onDisconnect();

                });

            }

        },

        isInitialized: function (flowKey) {

            return rooms.hasOwnProperty(manywho.utils.extractStateId(flowKey));

        },

        enable: function(flowKey) {

            rooms[manywho.utils.extractStateId(flowKey)].isEnabled = true;

            if (!socket) {

                this.initialize(true, flowKey);

            }

        },

        disable: function(flowKey) {

            rooms[manywho.utils.extractStateId(flowKey)].isEnabled = false;

        },

        join: function(user, flowKey) {

            var stateId = manywho.utils.extractStateId(flowKey);

            if (socket && rooms[stateId].isEnabled) {

                rooms[stateId].user = user;
                socket.emit('join', { stateId: stateId, user: user });

            }

        },

        leave: function(flowKey) {

            var stateId = manywho.utils.extractStateId(flowKey);

            if (socket && rooms[stateId].isEnabled) {

                socket.emit('left', { stateId: stateId, user: user });

            }

        },

        push: function (id, values, flowKey) {

            var stateId = manywho.utils.extractStateId(flowKey);

            if (socket && rooms[stateId].isEnabled) {

                socket.emit('change', { id: id, values: values, stateId: stateId });

            }

        },

        sync: function (flowKey) {

            var stateId = manywho.utils.extractStateId(flowKey);

            if (socket && rooms[stateId].isEnabled) {

                socket.emit('sync', { stateId: stateId, owner: socket.id });

            }

        },

        move: function (flowKey) {

            var stateId = manywho.utils.extractStateId(flowKey);

            if (socket && rooms[stateId].isEnabled) {

                socket.emit('move', { stateId: stateId, owner: socket.id });

            }

        },

        getValues: function (flowKey) {

            var stateId = manywho.utils.extractStateId(flowKey);

            if (socket && rooms[stateId].isEnabled) {

                socket.emit('getValues', { stateId: stateId, id: socket.id });

            }

        }

    }

})(manywho);