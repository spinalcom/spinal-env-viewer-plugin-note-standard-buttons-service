import {
    SpinalGraphService
  } from 'spinal-env-viewer-graph-service';
  
  import geographicService from "spinal-env-viewer-context-geographic-service";
  
  import {
    BIM_OBJECT_TYPE
  } from "spinal-env-viewer-plugin-forge/dist/Constants";
  
  
  import {
    SELECTrelationList,
    isShownParam
  } from "spinal-env-viewer-plugin-standard_button/js/utilities";
  
  
//   import {
//     SPINAL_TICKET_SERVICE_TICKET_TYPE,
//     SPINAL_TICKET_SERVICE_TICKET_RELATION_NAME,
//     SPINAL_TICKET_SERVICE_STEP_TYPE,
//   } from "spinal-service-ticket/dist/Constants";
  
  
  let ItemColoredMap = new Map();
  let BimElementsColor = new Map();
  
export class Standard_buttons_service {
  
    static getIcon(nodeInfo, contextInfo, groupType) {
      return this._isColored(nodeInfo, contextInfo,groupType).then(isColored => {
        return isColored;
      })
    }
  
    static restoreItem(nodeInfo, contextInfo, childrenType,groupType) {
      this.getGroups(nodeInfo, contextInfo,groupType).then(res => {
        res.forEach(el => {
          let id = el.id;
          this._restoreGroup(contextInfo.id, id, childrenType);
        })
      })
    }
  
    static colorItem(nodeInfo, contextInfo, childrenType, groupType) {
      this.getGroups(nodeInfo, contextInfo, groupType).then(res => {
        res.forEach(el => {
          let id = el.id;
          let color = el.color ? el.color : undefined;
          this._colorGroup(contextInfo.id, id, color, childrenType);
        })
      })
    }
  
    static getGroups(selectedNode, contextInfo, groupType) {
      const type = selectedNode.type;
      const nodeId = selectedNode.id;
      const contextId = contextInfo.id;
  
      if (type === groupType) {
        return Promise.resolve([selectedNode]);
      }
  
      return SpinalGraphService.findInContext(nodeId, contextId, (node) => {
        SpinalGraphService._addNode(node);
        let argType = node.getType().get();
        return argType === groupType
        //   return groupManagerService.isGroup(argType);
      }).then(res => {
        return res.map(el => {
          return el.get();
        })
      })
    }
  
    static async getBimObjects(contextId, groupId, nodeType) {
      const nodes = await this._findItemByNodeType(groupId, contextId, nodeType);
      const parents = await this._getParents(nodes);
  
      const promises = parents.map(el => this._getItemsBim(el));
  
      return Promise.all(promises).then((result) => {
        const res = [];
        result.forEach(el => res.push(...el));
        return res;
      })
    }
  
    ////////////////////////////////////////////////////////////
    //                    PRIVATE                             //
    ////////////////////////////////////////////////////////////
  
  
    static _isColored(selectedNode, contextInfo, groupType) {
      return this.getGroups(selectedNode, contextInfo,groupType).then(res => {
  
        if (res.length === 0) return false;
  
        for (let index = 0; index < res.length; index++) {
          const id = res[index].id;
  
          if (typeof ItemColoredMap.get(id) === "undefined") {
            return false;
          }
  
        }
  
        return true;
  
      })
  
    }
  
    static _colorGroup(contextId, groupId, argColor, nodeType) {
  
      return this.getBimObjects(contextId, groupId, nodeType).then(res => {
  
        let color = typeof argColor !== "undefined" ? this
          ._convertHexColorToRGB(argColor) : this._convertHexColorToRGB(
            "#000000");
  
        ItemColoredMap.set(groupId, groupId);
  
        res.forEach(child => {
          let BimColors = BimElementsColor.get(child.dbid) ?
            BimElementsColor.get(child.dbid) : [];
  
          BimColors.push({
            id: groupId, //node.id,
            color: color
          });
  
          BimElementsColor.set(child.dbid, BimColors);
  
          let model = window.spinal.BimObjectService.getModelByBimfile(
            child.bimFileId);
  
          model.setThemingColor(child.dbid, new THREE.Vector4(
              color.r / 255, color.g / 255, color.b / 255, 0.7, true)
  
          );
  
        });
  
      })
    }
  
    static _restoreGroup(contextId, groupId, nodeType) {
      ItemColoredMap.delete(groupId);
      return this.getBimObjects(contextId, groupId, nodeType).then(res => {
        res.forEach(child => {
  
          let model = window.spinal.BimObjectService.getModelByBimfile(
            child.bimFileId);
  
          model.setThemingColor(
            child.dbid,
            // eslint-disable-next-line no-undef
            new THREE.Vector4(0, 0, 0, 0),
            true
          );
  
          let allColors = BimElementsColor.get(child.dbid);
  
          if (allColors) {
            //   allColors = allColors.filter(el => el.id !== node.id.get());
            allColors = allColors.filter(el => el.id !== groupId);
            BimElementsColor.set(child.dbid, allColors);
  
            if (allColors.length > 0) {
              let color = allColors[0].color;
              model.setThemingColor(
                child.dbid,
                // eslint-disable-next-line no-undef
                new THREE.Vector4(
                  color.r / 255,
                  color.g / 255,
                  color.b / 255,
                  0.7
                ),
                true
              );
            }
          }
        })
      })
    }
  
    static _findItemByNodeType(startNodeId, contextId, nodeType) {
      return SpinalGraphService.findInContext(startNodeId, contextId, (node) => {
        SpinalGraphService._addNode(node);
        let argType = node.getType().get();
        return argType === nodeType;
      }).then(res => {
        return res.map(el => {
          return el.get();
        })
      })
    }
  
    static _convertHexColorToRGB(hex) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } :
        null;
    }
  
    static _getParents(nodes) {
      const promises = nodes.map(async el => {
        const realNode = SpinalGraphService.getRealNode(el.id);
        const parents = await realNode.getParents();
  
        return parents
          .filter((el) => {
            return isShownParam.indexOf(el.getType().get()) !== -1;
          })
      });
  
      return Promise.all(promises).then((result) => {
  
        const res = [];
  
        result.forEach(element => {
          const infos = element.map(el => {
            SpinalGraphService._addNode(el);
            return el.info.get()
          });
  
          res.push(...infos);
        });
  
        return res;
      })
  
    }
  
    static _getItemsBim(nodeInfo) {
  
      const type = nodeInfo.type;
      const nodeId = nodeInfo.id;
  
      if (type === BIM_OBJECT_TYPE) {
        return Promise.resolve([nodeInfo]);
      } else if (type === geographicService.constants
        .ROOM_TYPE) {
        return SpinalGraphService.getChildren(nodeId, [geographicService
          .constants
          .REFERENCE_RELATION, geographicService.constants
          .EQUIPMENT_RELATION
        ]);
      } else {
        // let relations = [
        //   ...geographicService.constants.GEOGRAPHIC_RELATIONS,
        //   geographicService.constants.REFERENCE_RELATION
        // ];
  
        return SpinalGraphService.findNodes(nodeId, SELECTrelationList, (
          node) => {
          return node.getType().get() === BIM_OBJECT_TYPE
        }).then(res => {
          return res.map(el => {
            SpinalGraphService._addNode(el);
            return el.info.get();
          })
        })
      }
    }
  
    ////////////////////////////////////////////////////////////////////
    //                    Standard Buttons functions                  //
    ////////////////////////////////////////////////////////////////////
  
    static async getGeographicElement(ticketId) {
  
      const realNode = SpinalGraphService.getRealNode(ticketId);
      const parents = await realNode.getParents();
  
      return parents
        .filter((el) => {
          SpinalGraphService._addNode(el);
          return isShownParam.indexOf(el.getType().get()) !== -1;
        })
        .map((el) => el.info);
    };
  
    static async getNodesParents(startNodeId, contextId, nodeType) {
      const nodes = await this._findItemByNodeType(startNodeId, contextId, nodeType);
  
      const promises = nodes.map(el => this.getGeographicElement(el.id));
  
      return Promise.all(promises).then(async nodesParentNode => {
        const el = nodesParentNode.flat();
        const promises = el.map(v => this._getItemsBim(v));
        let bims = await Promise.all(promises);
        bims = bims.flat();
  
        const bimMap = new Map();
  
        for (const bimObject of bims) {
          const bimFileId = bimObject.bimFileId;
          const dbid = bimObject.dbid;
  
          if (typeof bimMap.get(bimFileId) === "undefined") {
            bimMap.set(bimFileId, new Set());
          }
  
          bimMap.get(bimFileId).add(dbid);
        }
        const res = []
  
        for (const [key, value] of bimMap.entries()) {
          res.push({
            model: window.spinal.BimObjectService
              .getModelByBimfile(key),
            ids: Array.from(value)
          })
        }
  
        return res;
  
      });
    }
  
  }
  
  
  export default Standard_buttons_service