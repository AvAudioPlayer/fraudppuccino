package com.signalcollect.fraudppuccino.patternanalysis

import com.signalcollect.fraudppuccino.repeatedanalysis.VertexAlgorithm
import com.signalcollect.fraudppuccino.repeatedanalysis.RepeatedAnalysisVertex
import com.signalcollect.fraudppuccino.structuredetection.DownstreamTransactionPatternEdge
import com.signalcollect.fraudppuccino.structuredetection.UpstreamTransactionPatternEdge
import com.signalcollect.fraudppuccino.structuredetection.UpstreamTransactionEdge
import com.signalcollect.fraudppuccino.structuredetection.TransactionPatternEdge

trait TransactionRelationshipExplorer extends VertexAlgorithm {

  /**
   * Returns true if this vertex is a source of a transaction sub-pattern.
   */
  def isPatternSource: Boolean = !hasPredecessors && hasSuccessors
  
  /**
   * Returns true if this vertex is a sink of a transaction sub-pattern
   */ 
  def isPatternSink: Boolean = hasPredecessors && !hasSuccessors
  
  def isIsolated : Boolean = !getHostVertex.outgoingEdges.exists(_._2.isInstanceOf[TransactionPatternEdge])
  
  def isSplitter = getHostVertex.outgoingEdges.count(_._2 == DownstreamTransactionPatternEdge) > 1
  
  def isAggregator = getHostVertex.outgoingEdges.count(_._2 == UpstreamTransactionPatternEdge) > 1

  def hasPredecessors: Boolean = getHostVertex.outgoingEdges.exists(_._2 == UpstreamTransactionPatternEdge)
  
  def hasSuccessors: Boolean = getHostVertex.outgoingEdges.exists(_._2 == DownstreamTransactionPatternEdge)
  
  def countPredecessors: Int = getHostVertex.outgoingEdges.count(_._2 == UpstreamTransactionPatternEdge)
  
  def countSuccessors: Int = getHostVertex.outgoingEdges.count(_._2 == UpstreamTransactionPatternEdge)
  
}