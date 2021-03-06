
package com.signalcollect.fraudppuccino.componentanalysis.algorithms

import com.signalcollect.fraudppuccino.repeatedanalysis._
import com.signalcollect._
import com.signalcollect.fraudppuccino.repeatedanalysis.EdgeMarkers._


/**
 * Explores the depth of this vertex. I.e. their longest distance from a
 * source vertex within this component.
 */
case class PatternDepthAnalyzer(vertex: RepeatedAnalysisVertex[_]) extends VertexAlgorithm with TransactionRelationshipExplorer {

  var depth = 0

  def getState = depth

  def setState(state: Any) = {
    state match {
      case newDepth: Int => depth = newDepth
      case _ =>
    }
  }

  def deliverSignal(signal: Any, sourceId: Option[Any], graphEditor: GraphEditor[Any, Any]) = {
    signal match {
      case signaledDepth: Int => if (signaledDepth > depth) {
        depth = signaledDepth
        scoreSignal = 1.0
      }
      case _ =>
    }
    true
  }

  def executeSignalOperation(graphEditor: GraphEditor[Any, Any], outgoingEdges: Iterable[(Any, EdgeMarker)]) {
    outgoingEdges.filter(edge => edge._2 == DownstreamTransactionPatternEdge).foreach(edge => graphEditor.sendSignal(depth + 1, edge._1, Some(vertex.id)))
    scoreSignal = 0
  }

  def executeCollectOperation(graphEditor: GraphEditor[Any, Any]) = {}

  var scoreSignal = if (isPatternSource) 1.0 else 0.0

  var scoreCollect = 0.0

  def notifyTopologyChange {}
}