#!/bin/bash
grpc_tools_node_protoc --js_out=import_style=commonjs,binary:protos --grpc_out=protos --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` services.proto
