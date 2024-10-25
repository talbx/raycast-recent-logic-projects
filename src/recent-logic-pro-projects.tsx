import {Action, ActionPanel, Icon, List, open} from "@raycast/api";
import {useEffect, useState} from "react";
import {exec} from "node:child_process";
import {promisify} from "node:util";
import * as crypto from "node:crypto";
import {showFailureToast} from "@raycast/utils";

export interface LogicProject {
    name: string
    id: string
    path: string
    lastModified: Date
}

export default function Command(props: { arguments: { folderPath?: string } }) {
    const [projects, setProjects] = useState<LogicProject[]>([]);
    const [, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error>();
    //const {directories} = getPreferenceValues();
    // default location
    const [path, setPath] = useState<string>("~/Music/Logic")
    const [searchText, setSearchText] = useState("~/Music/Logic");

    useEffect(() => {
        console.log(props.arguments)
        const execAsync = promisify(exec);
        setIsLoading(true);
        setError(undefined)
        if (searchText !== undefined) {
            setPath(searchText)
        }

        execAsync(
            // `ls -A1 ${path} | grep .logicx`
            `find ${path} -regex ".*\\.\\(logicx\\)" | head -n 200 | xargs -I{} stat -f "%N,%m" "{}"`
        ).then(result => {
            if (result.stderr !== null && result.stderr !== "") {
                console.log("err", result.stderr)
                setError(new Error(result.stderr))
                return []
            }
            console.log("no err")
            const projects: LogicProject[] = result.stdout.trim().split("\n").filter(entry => entry.includes(","))
                .map(entry => {
                    const [p, lastModified] = entry.split(",");
                    const lastModifiedDate = new Date(Number(lastModified) * 1000);
                    const lastSlashIndex = p.lastIndexOf("/");
                    //const beforeLastSlash = p.substring(0, lastSlashIndex);  // "path/to/your"
                    const afterLastSlash = p.substring(lastSlashIndex + 1);  // "file.txt"

                    return {
                        name: afterLastSlash,
                        lastModified: isNaN(lastModifiedDate.getTime()) ? new Date(0) : lastModifiedDate, // Handle invalid dates
                        id: crypto.createHash("md5").update(entry).digest("hex"),
                        path: path
                    }
                }).sort((a,b) => {
                    if (a.lastModified < b.lastModified) {
                        return 1
                    }
                    return -1
                })
            setError(undefined)
            setProjects(projects)
            setIsLoading(false)
        }).catch(err => {
            console.log("err", err)
            setError(new Error(err))
            return []
        })
    }, [setProjects, setIsLoading, setError, path, setPath, searchText])


    useEffect(() => {
        if (error !== undefined) {

            showFailureToast(error, {
                title: "Something went wrong",
            });
        }
    }, [error, setError]);

    return (
        <List
            searchText={searchText}
            onSearchTextChange={setSearchText}>
            {
                projects.map(project => {
                    return <List.Item
                        key={project.id}
                        accessories={[
                            {
                                date: {
                                    value: project.lastModified
                                }
                            }
                        ]}
                        icon={Icon.Headphones}
                        title={project.name}
                        actions={
                            <ActionPanel>
                                <Action title="Open Project" onAction={() => open(project.path)}/>
                            </ActionPanel>
                        }
                        detail={<List.Item.Detail markdown={"#Hello!"}/>}

                    />
                })
            }

        </List>
    );
}
