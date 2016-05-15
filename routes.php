<?php
$month = $_GET['m'];
$vehicle = $_GET['v'];
$priority = $_GET['p'];
$source = $_GET['s'];
$target = $_GET['t'];
$transferRiver = $_GET['tr'];
$transferSea = $_GET['ts'];
$modeList = $_GET['ml'];
$excludeList = $_GET['el'];
$roadCost = $_GET['rc'];
$upstreamCost = $_GET['uc'];
$downstreamCost = $_GET['dc'];
$seaCost = $_GET['sc'];
// display errors or not...

include 'conn.php';
$link = pg_connect($connectString_ov2);

$priorityQuery = "(o_speed_new('".$vehicle."',type,o_routing.the_geom,o_routing.cost) + o_alt_adjust('".$vehicle."',restricted))";
$priorityQuery2 = "(o_speed_new(''".$vehicle."'',type,o_routing.the_geom,o_routing.cost) + o_alt_adjust(''".$vehicle."'',restricted))";
$priorityQuery3 = "(o_speed_new('".$vehicle."',type,o_routing.the_geom,".$transferRiver."))";
$priorityQuery4 = "(o_speed_new(''".$vehicle."'',type,o_routing.the_geom,".$transferRiver."))";

if($priority == 1) {
$priorityQuery = "(o_expense('".$vehicle."',type,o_routing.the_geom,o_routing.cost))";
$priorityQuery2 = "(o_expense_advanced('custom',type,o_routing.the_geom,o_routing.cost,".$roadCost.",".$downstreamCost.",".$upstreamCost.",".$seaCost.",".$transferRiver.",".$transferSea."))";
$priorityQuery3 = "(o_expense('".$vehicle."',type,o_routing.the_geom,".$transferRiver."))";
$priorityQuery4 = "(o_expense(''".$vehicle."'',type,o_routing.the_geom,".$transferRiver."))";
}

else if($priority == 2) {
$priorityQuery = "((st_length(Geography(ST_Transform(o_routing.the_geom,4326)))) / 1000)";
$priorityQuery2 = "((st_length(Geography(ST_Transform(o_routing.the_geom,4326)))) / 1000)";
$priorityQuery3 = "0";
$priorityQuery4 = "0";
}

$sql = "
WITH o AS (
SELECT

'{\"type\": \"Feature\", \"geometry\": '||ST_AsGeoJson(o_routing.the_geom,3,0)||',
\"properties\": {
\"source\":'||source||',
\"target\":'||target||',
\"segmentlength\": '||(st_length(Geography(ST_Transform(o_routing.the_geom,4326))) /
1000)::numeric(10,3)||',
\"segmentduration\": '||
(CASE
when type = 'transferc' then ".$transferSea."
when type = 'transferr' then ".$transferRiver."
else (o_speed_new('".$vehicle."',type,o_routing.the_geom,o_routing.cost) + o_alt_adjust('".$vehicle."',restricted))
END)
||',
\"segmentexpense_w\": '||
(CASE
when type = 'transferc' then ".$transferSea."
when type = 'transferr' then ".$transferRiver."
else o_expense('wagon',o_routing.type,o_routing.the_geom,o_routing.cost)::numeric(10,3)
END)
||',
\"segmentexpense_d\": '||
(CASE
when type = 'transferc' then ".$transferSea."
when type = 'transferr' then ".$transferRiver."
else o_expense('donkey',o_routing.type,o_routing.the_geom,o_routing.cost)::numeric(10,3)
END)
||',
\"segmentexpense_c\": '||
(CASE
when type = 'transferc' then ".$transferSea."
when type = 'transferr' then ".$transferRiver."
else o_expense('carriage',o_routing.type,o_routing.the_geom,o_routing.cost)::numeric(10,3)
END)
||',
\"segment_id\": '||o_routing.gid||',
\"segment_type\": \"'||o_routing.type||'\"}}' as content

FROM

shortest_path('
SELECT DISTINCT ON (source,target)
gid as id,
source::integer,
target::integer,
(CASE
when type = ''transferc'' then ".$transferSea."
when type = ''transferr'' then ".$transferRiver."
else ".$priorityQuery2."
END) as cost
FROM
o_routing WHERE month IN(0,".$month.")
AND
(''".$modeList."'' LIKE (''%''||type||''%''))
AND (restricted NOT LIKE ''%''||type||''%'' OR restricted IS NULL)
AND
(
right(target::character varying,5)::integer NOT IN (".$excludeList.")
)
AND
(
right(source::character varying,5)::integer NOT IN (".$excludeList.")
)
OR
source = target
ORDER BY
source,
target,
(CASE
when type = ''transferc'' then ".$transferSea."
when type = ''transferr'' then ".$transferRiver."
else ".$priorityQuery2."
END)
',".$source.",".$target.",true,false)
LEFT JOIN o_routing ON o_routing.gid = edge_id
LEFT JOIN o_sites as s ON s.objectid = o_routing.source
LEFT JOIN o_sites as t ON t.objectid = o_routing.target

WHERE
o_routing.gid IS NOT NULL
)
SELECT
'{\"type\": \"FeatureCollection\", \"features\": ['||string_agg(content,',')||']}'
FROM
o
";

if (!$link) {
    echo "error, didn't make the pg_connect()";
} else {
	$result = pg_query($link, $sql);
	if (!$result) {
	  echo "error, no result!<br>";
      print pg_last_error($link);
	  exit;
	}
}

	while ($row = pg_fetch_row($result)) {
	  	echo($row[0]);

	}

pg_close($link);
?>
