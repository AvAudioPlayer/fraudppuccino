package com.signalcollect.fraudppuccino.componentdetection

import com.signalcollect.fraudppuccino.repeatedanalysis.RepeatedAnalysisVertex
import scala.collection.mutable.ArrayBuffer
import com.signalcollect._
import com.signalcollect.configuration.ActorSystemRegistry
import akka.actor.ActorRef
import com.signalcollect.fraudppuccino.structuredetection.DownstreamTransactionPatternEdge
import ch.epfl.lamp.compiler.msil.MemberInfo
import scala.collection.mutable.HashSet

/**
 *  Serves as the main point of access to a connected component.
 */
class ComponentMaster(vertex: RepeatedAnalysisVertex[_]) extends ComponentMember(vertex) {

  //Stores the Ids of all the members of the component that it represents
  //will include itself as a member i.e. members.size >= 1
  val members = ArrayBuffer[Any]()

  //All the members that we know of during the registration phase 
  //allows to decide when all members are registered with the master
  val registeredMembersNeighborhood = HashSet[Any]()

  val system = ActorSystemRegistry.retrieve("SignalCollect").get
  val handler = system.actorFor("akka://SignalCollect/user/componentHandler")

  val repliesFromMembers = ArrayBuffer[ComponentMemberMessage]()
  var allReceived: (Iterable[ComponentMemberMessage], ComponentMaster, GraphEditor[_, _]) => Unit = null

  override def deliverSignal(signal: Any, sourceId: Option[Any], graphEditor: GraphEditor[Any, Any]) = {

    signal match {
      case ComponentMemberRegistration(neighborhood) => {
        registeredMembersNeighborhood ++= neighborhood
        registeredMembersNeighborhood += sourceId.get
        members += sourceId.get
        if (registeredMembersNeighborhood.size == members.size) {
          registeredMembersNeighborhood.clear
          graphEditor.sendToActor(handler, ComponentAnnouncement(vertex.id))
        }
        true
      }

      case ComponentMasterQuery(query, label) => {
        graphEditor.sendToActor(handler, ComponentReply(vertex.id, Some(query(this))))
        if (label.isDefined) {
          vertex.storeAttribute(label.get, query(this))
        }
        true
      }

      case ComponentMemberQueryExecution(memberQuery, resultsProcessing) => {
        repliesFromMembers.clear
        allReceived = resultsProcessing

        members.foreach(memberId => {
          graphEditor.sendSignal(memberQuery, memberId, Some(vertex.id))
        })

        true
      }

      case ComponentElimination => {
        members.foreach(memberId => {
          graphEditor.sendSignal(ComponentMemberElimination, memberId, Some(vertex.id))
        })
        true
      }

      case memberMessage: ComponentMemberMessage => {
        repliesFromMembers += memberMessage
        if (repliesFromMembers.size == members.size) {
          allReceived(repliesFromMembers, this, graphEditor)
        }
        true
      }

      case _ => super.deliverSignal(signal, sourceId, graphEditor)
    }
  }

  def serializeComponent(memberInfos: Iterable[ComponentMemberInfo]): String = {
    val componentId = vertex.id.toString
    val component = "{" +
      "\"id\" : " + componentId + "," +
      "\"start\":" + memberInfos.map(_.results("time").asInstanceOf[Long]).min * 1000l + "," +
      "\"end\":" + memberInfos.map(_.results("time").asInstanceOf[Long]).max * 1000l + "," +
      "\"flow\":" + memberInfos.map(_.results("value").asInstanceOf[Long]).max + "," +
      "\"members\":[" + memberInfos.map(member => {
        "{\"id\":" + member.id + "," + member.results.map(result => "\"" + result._1 + "\":" + result._2.toString).mkString(",") +
          ",\"successor\":[" + member.successors.mkString(",") + "]}"
      }).toList.mkString(",") +
      "]}"
    component
  }
}