package com.signalcollect.fraudppuccino.componentanalysis.algorithms

import com.signalcollect.fraudppuccino.repeatedanalysis._
import com.signalcollect._
import com.signalcollect.fraudppuccino.structuredetection._


class PeelingChainIdentifier(vertex: RepeatedAnalysisVertex[_]) extends VertexAlgorithm(vertex) with TransactionRelationshipExplorer {

  def getState = None

  def setState(state: Any) = {
  }

  def deliverSignal(signal: Any, sourceId: Option[Any], graphEditor: GraphEditor[Any, Any]) = {
    signal match {
      case output: TransactionOutput => {
        if (output.value < 0.5 * this.value) {
          val successors = vertex.outgoingEdges.filter(_._2 == DownstreamTransactionPatternEdge)
          if (successors.size == 2) {
            successors.foreach(successor => graphEditor.addEdge(vertex.id, new PeeelingChainEdge(successor._1), true))
          }
        }
      }
      case _ => throw new Exception("Unknown signal received: " + signal)
    }
    true
  }

  def executeSignalOperation(graphEditor: GraphEditor[Any, Any], outgoingEdges: Iterable[(Any, EdgeMarker)]) {
    val parentId = outgoingEdges.find(_._2 == UpstreamTransactionPatternEdge).get
    graphEditor.sendSignal(TransactionOutput(vertex.id.asInstanceOf[Int], value, time), parentId._1, Some(vertex.id))
    scoreSignal = 0.0
  }

  def executeCollectOperation(graphEditor: GraphEditor[Any, Any]) = {
  }

  var scoreSignal: Double = { if (isPatternSink) 1.0 else 0.0 }

  var scoreCollect = 0.0

  def notifyTopologyChange {
  }

}

case object PeelingChain extends EdgeMarker
class PeeelingChainEdge(targetId: Any) extends EdgeMarkerWrapper(targetId, PeelingChain)