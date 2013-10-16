package com.signalcollect.fraudppucchino.componentdetection

import org.junit.runner.RunWith
import org.specs2.runner.JUnitRunner
import org.specs2.mutable.SpecificationWithJUnit
import com.signalcollect._
import com.signalcollect.fraudppuccino.componentdetection.ComponentMember
import com.signalcollect.fraudppuccino.repeatedanalysis._
import com.signalcollect.fraudppuccino.componentdetection.ComponentMaster
import com.signalcollect.fraudppuccino.componentdetection.ComponentSizeQuery
import akka.event.Logging.LogLevel
import akka.event.Logging
import com.signalcollect.fraudppuccino.componentdetection.ComponentHandler
import com.signalcollect.configuration.ActorSystemRegistry
import akka.actor.Props
import com.signalcollect.fraudppuccino.componentdetection.ComponentHandler
import akka.actor.Actor

@RunWith(classOf[JUnitRunner])
class MemberAnnoucementSpec extends SpecificationWithJUnit {

  sequential
  val graph = GraphBuilder.build

  "the component handler" should {
    "register itself in the actor system " in {
      //Register a component handler
      val system = ActorSystemRegistry.retrieve("SignalCollect").get
      val componentHandler = system.actorOf(Props(new ComponentHandler), "componentHandler")
      system.actorFor("akka://SignalCollect/user/componentHandler") === componentHandler
    }
  }

  "component members" should {

    "announce themselves at the component master" in {

      //(ComponentMember ID, Component ID)
      val componentMembers = List((1, 1), (2, 1), (3, 1), (4, 4))

      componentMembers.foreach(componentMember => {
        val vertex = new RepeatedAnalysisVertex(componentMember._1)
        vertex.storeAttribute("component", componentMember._2)

        if (componentMember._1 == componentMember._2) {
          vertex.setAlgorithmImplementation(v => new ComponentMaster(v))
        } else {
          vertex.setAlgorithmImplementation(v => new ComponentMember(v))
        }

        graph.addVertex(vertex)
      })

      graph.recalculateScores
      graph.execute

      graph.sendSignal(ComponentSizeQuery, 1, None)
      graph.sendSignal(ComponentSizeQuery, 4, None)

      graph.forVertexWithId(vertexId = 1, f = { v: RepeatedAnalysisVertex[_] => v.getResult("componentSize") }) === Some(3)
      graph.forVertexWithId(vertexId = 4, f = { v: RepeatedAnalysisVertex[_] => v.getResult("componentSize") }) === Some(1)
    }
  }
}